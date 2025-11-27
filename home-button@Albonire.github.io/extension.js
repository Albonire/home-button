'use strict';

import St from 'gi://St';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import Meta from 'gi://Meta';
import Clutter from 'gi://Clutter';
import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';

log('Home Button Extension: module loaded');
try {
    GLib.file_set_contents('/tmp/home-button-module-loaded', 'module loaded\n');
} catch (e) {
    log(`Home Button Extension: failed to write module marker: ${e}`);
}

export default class HomeButtonExtension extends Extension {
    constructor(metadata) {
        super(metadata);
        log('Home Button Extension: constructor called');
        try {
            GLib.file_set_contents('/tmp/home-button-constructor', 'constructor called\n');
        } catch (e) {
            log(`Home Button Extension: failed to write constructor marker: ${e}`);
        }
        this._indicator = null;
        this._icon = null;
        this._minimizedWindows = [];
        this._settings = null;
        this._animationTimeoutId = null;
        this._isAnimatingIcon = false;
        this._currentIconState = 'home'; // 'home' or 'restore'
        this._lastFocusedWindow = null;
        this._windowStates = new Map(); 
        this._restoreTimeoutId = null;
        this._updateStateTimeoutId = null;
        this._currentAnimationTarget = null;
        this._settingsConnections = new Map();
        this._iconSize = 24;
    }

    enable() {
        log('Home Button Extension: enable start');
        try {
            GLib.file_set_contents('/tmp/home-button-enable', 'enable start\n');
        } catch (e) {
            log(`Home Button Extension: failed to write enable marker: ${e}`);
        }
        try {
            this._settings = this.getSettings();
            log('Home Button Extension: settings loaded successfully');
        } catch (e) {
            // If the settings schema is not found or not compiled, do not enable to avoid errors.
            log(`Home Button Extension: Failed to load settings schema: ${e}`);
            return;
        }
        this._indicator = new St.Bin({
            reactive: true,
            can_focus: true,
            track_hover: true,
            name: 'home-button-indicator',
            style_class: 'panel-button',
        });

        this._icon = new St.Icon({ 
            style_class: 'home-button-icon system-status-icon'
        });
        this._indicator.set_child(this._icon);

        this._currentIconState = 'home';  
        this._isAnimatingIcon = false;

        this._indicator.connect('button-press-event', (actor, event) => {
            if (event.get_button() === Clutter.BUTTON_PRIMARY) {
                this._toggleWindows();
                // Stop propagation so the click doesn't reach other panel handlers.
                return Clutter.EVENT_STOP;
            }
            return Clutter.EVENT_PROPAGATE;
        });

        this._settingsConnections = new Map();
        // Add an optional debug style for visual testing if HOME_BUTTON_DEBUG environment var is set
        try {
            if (GLib.getenv('HOME_BUTTON_DEBUG')) {
                this._indicator.add_style_class_name('debug-visible');
                log('Home Button Extension: DEBUG visual enabled via HOME_BUTTON_DEBUG');
            }
        } catch (e) {
            // no-op
        }
        this._connectSettings();
        // Apply icon size and path before adding to panel to avoid ghost state.
        this._updateIconSize();
        this._updateIconPath();
        // Prevent the indicator from expanding and affecting the panel layout
        try {
            this._indicator.set_x_expand(false);
            this._indicator.set_y_align(St.Align.MIDDLE);
            this._indicator.set_x_align(St.Align.MIDDLE);
            this._indicator.set_width(this._iconSize + 12);
        } catch (e) {
            log(`Home Button Extension: failed to set indicator alignment/size: ${e}`);
        }
        this._addToPanel();
        this._updateState();
        log('Home Button Extension: enable complete');
    }

    disable() {
        if (this._updateStateTimeoutId) {
            GLib.Source.remove(this._updateStateTimeoutId);
            this._updateStateTimeoutId = null;
        }
        
        this._cleanupAnimation();

        if (this._animationTimeoutId) {
            GLib.Source.remove(this._animationTimeoutId);
            this._animationTimeoutId = null;
        }

        if (this._restoreTimeoutId) {
            GLib.Source.remove(this._restoreTimeoutId);
            this._restoreTimeoutId = null;
        }

        if (this._settings && this._settingsConnections) {
            this._settingsConnections.forEach(id => {
                try {
                    this._settings.disconnect(id);
                } catch (e) {
                    // ignore if not connected
                }
            });
        }
        if (this._settingsConnections) {
            this._settingsConnections.clear();
        }
        this._indicator?.destroy();
        this._indicator = null;
        this._icon = null;
        this._minimizedWindows = [];
        this._settings = null;
        this._lastFocusedWindow = null;
        this._windowStates.clear();
        this._currentAnimationTarget = null;
        this._currentIconState = 'home'; // Reset icon state
    }

    _connectSettings() {
        const keys = [
            'button-position', 'icon-size', 'icon-path', 'show-count-in-tooltip',
            'animation-delay', 'include-all-workspaces', 'exclude-always-on-top'
        ];
        keys.forEach(key => {
            const id = this._settings.connect(`changed::${key}`, () => this._sync());
            this._settingsConnections.set(key, id);
        });
    }

    _sync() {
        this._addToPanel();
        this._updateIconSize();
        this._updateState();
    }

    _updateIconSize() {
        let size = 24;
        try {
            size = Math.max(16, Math.min(64, Math.round(this._settings.get_double('icon-size') || 24)));
        } catch (e) {
            log(`Home Button Extension: failed to read icon-size setting: ${e}`);
        }
        try {
            this._iconSize = size;
            this._icon.set_icon_size(size);
            log(`Home Button Extension: applied icon size ${size}`);
        } catch (e) {
            log(`Home Button Extension: failed to set icon size: ${e}`);
        }
    }

    _getDefaultIconPath() {
        const extensionPath = this.path;
        const defaultIconPath = GLib.build_filenamev([extensionPath, 'icons', 'home-symbolic.svg']);
        if (GLib.file_test(defaultIconPath, GLib.FileTest.EXISTS)) {
            return defaultIconPath;
        }
        
        return 'user-home-symbolic';
    }

    _updateIconPath() {
        const userIconPath = this._settings.get_string('icon-path');
        let iconPath;
        if (userIconPath === 'user-home-symbolic' || userIconPath === '') {
            // Prefer to set the themed symbolic icon by name first.
            try {
                // Use icon_name property for theme icons — more robust than set_gicon(null)
                this._icon.icon_name = 'user-home-symbolic';
                log('Home Button Extension: set icon_name to user-home-symbolic (theme)');
                return;
            } catch (e) {
                log(`Home Button Extension: failed to set theme icon name: ${e}`);
                iconPath = this._getDefaultIconPath();
            }
        } else {
            iconPath = userIconPath;
        }

        try {
            if (GLib.path_is_absolute(iconPath) && GLib.file_test(iconPath, GLib.FileTest.EXISTS)) {
                const file = Gio.File.new_for_path(iconPath);
                this._icon.set_gicon(new Gio.FileIcon({ file: file }));
                log(`Home Button Extension: using file icon: ${iconPath}`);
            } else {
                const gicon = Gio.icon_new_for_string(iconPath);
                if (gicon) {
                    this._icon.set_gicon(gicon);
                    log(`Home Button Extension: using themed icon name: ${iconPath}`);
                } else {
                    // Fall back to built-in file if theme icon not present
                    iconPath = this._getDefaultIconPath();
                    const file = Gio.File.new_for_path(iconPath);
                    this._icon.set_gicon(new Gio.FileIcon({ file: file }));
                    log(`Home Button Extension: fallback to file icon: ${iconPath}`);
                }
            }
        } catch (e) {
            console.warn(`Home Button Extension: Failed to load icon "${iconPath}", using fallback: ${e.message}`);
            this._icon.set_gicon(Gio.icon_new_for_string('user-home-symbolic'));
            log(`Home Button Extension: failed to set gicon: ${e}`);
        }
    }

    _animateIconTransition(newIconCallback, targetState) {
        if (this._currentIconState === targetState) {
            return;
        }
        
        this._cleanupAnimation();
        
        // Verificar que el ícono sigue siendo válido
        if (!this._icon || this._icon.is_finalized()) {
            console.warn('Home Button Extension: Cannot animate - icon is not valid. Applying fallback.');
            try {
                newIconCallback();
                this._currentIconState = targetState;
            } catch (e) {
                console.error(`Home Button Extension: Fallback icon change failed: ${e.message}`);
            }
            return;
        }
    
        this._isAnimatingIcon = true;
        const ANIMATION_DURATION = 150;
        
        this._currentAnimationTarget = this._icon;
        
        this._icon.ease({
            opacity: 0,
            duration: ANIMATION_DURATION / 2,
            mode: Clutter.AnimationMode.EASE_OUT_CUBIC,
            onComplete: () => {
                if (!this._icon || this._icon.is_finalized() || !this._isAnimatingIcon) {
                    this._resetAnimationState();
                    return;
                }
                
                try {
                    newIconCallback();
                    this._currentIconState = targetState;
                    
                    this._icon.ease({
                        opacity: 255,
                        duration: ANIMATION_DURATION / 2,
                        mode: Clutter.AnimationMode.EASE_IN_CUBIC,
                        onComplete: () => {
                            this._resetAnimationState();
                        },
                        onStopped: () => {
                            // Callback cuando la animación se detiene prematuramente
                            this._resetAnimationState();
                        }
                    });
                } catch (error) {
                    console.warn(`Home Button Extension: Animation error in phase 2: ${error.message}`);
                    this._resetAnimationState();
                }
            },
            onStopped: () => {
                this._resetAnimationState();
            }
        });
    }

    _cleanupAnimation() {
        if (this._isAnimatingIcon && this._icon && !this._icon.is_finalized()) {
            this._icon.remove_all_transitions();
            this._icon.set_opacity(255);
        }
        
        this._resetAnimationState();
    }

    _resetAnimationState() {
        this._isAnimatingIcon = false;
        this._currentAnimationTarget = null;
    }

    _updateState() {
        if (this._updateStateTimeoutId) {
            GLib.Source.remove(this._updateStateTimeoutId);
            this._updateStateTimeoutId = null;
        }

        // Only debounce if an animation is currently running
        if (this._isAnimatingIcon) {
            this._updateStateTimeoutId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 50, () => {
                this._doUpdateState();
                this._updateStateTimeoutId = null;
                return GLib.SOURCE_REMOVE;
            });
        } else {
            this._doUpdateState();
        }
    }

    _doUpdateState() {
        const hasMinimized = this._minimizedWindows.length > 0;
        const showCount = this._settings.get_boolean('show-count-in-tooltip');
    
        if (hasMinimized && this._currentIconState !== 'restore') {
            // Animate to restore icon
            this._animateIconTransition(() => {
                if (this._icon && !this._icon.is_finalized()) {
                    this._icon.set_gicon(Gio.icon_new_for_string('view-restore-symbolic'));
                }
            }, 'restore');
            
            this._indicator.tooltip_text = showCount
                ? `Restore ${this._minimizedWindows.length} window${this._minimizedWindows.length !== 1 ? 's' : ''}`
                : 'Restore windows';
            this._indicator.add_style_class_name('minimized-mode');
            
        } else if (!hasMinimized && this._currentIconState !== 'home') {
            this._animateIconTransition(() => {
                if (this._icon && !this._icon.is_finalized()) {
                    this._updateIconPath();
                }
            }, 'home');
            
            this._indicator.tooltip_text = 'Minimize all windows and show desktop';
            this._indicator.remove_style_class_name('minimized-mode');
        }
    
        // Update tooltip even if no animation is needed
        if (hasMinimized) {
            this._indicator.tooltip_text = showCount
                ? `Restore ${this._minimizedWindows.length} window${this._minimizedWindows.length !== 1 ? 's' : ''}`
                : 'Restore windows';
        } else {
            this._indicator.tooltip_text = 'Minimize all windows and show desktop';
        }
    }

    _captureWindowStates(windows) {
        this._windowStates.clear();
        this._lastFocusedWindow = null;

        const focusedWindow = global.display.get_focus_window();
        
        windows.forEach((window, index) => {
            if (!window || !window.get_compositor_private()) return;
            
            const windowState = {
                window: window,
                originalIndex: index,
                userTime: window.get_user_time(),
                wasActive: window === focusedWindow,
                workspace: window.get_workspace(),
                wmClass: window.get_wm_class(),
                title: window.get_title()
            };
            
            this._windowStates.set(window, windowState);
            
            if (window === focusedWindow) {
                this._lastFocusedWindow = window;
            }
        });

        if (!this._lastFocusedWindow && this._windowStates.size > 0) {
            let mostRecentWindow = null;
            let highestUserTime = 0;
            
            this._windowStates.forEach((state, window) => {
                if (state.userTime > highestUserTime) {
                    highestUserTime = state.userTime;
                    mostRecentWindow = window;
                }
            });
            
            this._lastFocusedWindow = mostRecentWindow;
        }
    }

    _activateWindowSmart(window) {
        if (!window || !window.get_compositor_private()) {
            return false;
        }

        try {
            const currentTime = global.get_current_time();
            const windowState = this._windowStates.get(window);
            
            if (windowState && windowState.workspace) {
                const currentWorkspace = global.workspace_manager.get_active_workspace();
                if (windowState.workspace !== currentWorkspace) {
                    windowState.workspace.activate(currentTime);
                    
                    GLib.timeout_add(GLib.PRIORITY_DEFAULT, 100, () => {
                        this._doWindowActivation(window, currentTime);
                        return GLib.SOURCE_REMOVE;
                    });
                    return true;
                }
            }
            
            return this._doWindowActivation(window, currentTime);
            
        } catch (e) {
            console.warn(`Home Button Extension: Failed to activate window: ${e.message}`);
            return false;
        }
    }

    _doWindowActivation(window, currentTime) {
        if (!window || !window.get_compositor_private()) {
            return false;
        }

        try {
            window.raise();
            window.activate(currentTime);
            window.focus(currentTime);
            
            if (Main.activateWindow) {
                Main.activateWindow(window);
            }
            
            return true;
        } catch (e) {
            console.warn(`Home Button Extension: Core activation failed: ${e.message}`);
            return false;
        }
    }

    _processWindowList(windows, action) {
        const delay = this._settings.get_int('animation-delay');
        
        if (action === 'minimize') {
            this._captureWindowStates(windows);
        }
        
        if (delay === 0) {
            windows.forEach(win => {
                if (win?.get_compositor_private()) {
                    action === 'minimize' ? win.minimize() : win.unminimize();
                }
            });
            
            if (action === 'unminimize') {
                this._scheduleWindowRestoration();
            }
            this._updateState();
            return;
        }

        let i = 0;
        this._animationTimeoutId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, delay, () => {
            if (i < windows.length) {
                const win = windows[i];
                if (win?.get_compositor_private()) {
                    action === 'minimize' ? win.minimize() : win.unminimize();
                }
                i++;
                return GLib.SOURCE_CONTINUE;
            }
            
            if (action === 'unminimize') {
                this._scheduleWindowRestoration();
            }
            
            this._animationTimeoutId = null;
            this._updateState();
            return GLib.SOURCE_REMOVE;
        });
    }

    _scheduleWindowRestoration() {
        if (this._restoreTimeoutId) {
            GLib.Source.remove(this._restoreTimeoutId);
            this._restoreTimeoutId = null;
        }

        this._restoreTimeoutId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 150, () => {
            this._performWindowRestoration();
            this._restoreTimeoutId = null;
            return GLib.SOURCE_REMOVE;
        });
    }

    _performWindowRestoration() {
        let windowToFocus = null;

        if (this._lastFocusedWindow && 
            this._minimizedWindows.includes(this._lastFocusedWindow) &&
            this._lastFocusedWindow.get_compositor_private()) {
            windowToFocus = this._lastFocusedWindow;
        }

        if (!windowToFocus) {
            this._windowStates.forEach((state, window) => {
                if (state.wasActive && 
                    this._minimizedWindows.includes(window) &&
                    window.get_compositor_private()) {
                    windowToFocus = window;
                }
            });
        }

        if (!windowToFocus) {
            let highestUserTime = 0;
            this._windowStates.forEach((state, window) => {
                if (this._minimizedWindows.includes(window) &&
                    window.get_compositor_private() &&
                    state.userTime > highestUserTime) {
                    highestUserTime = state.userTime;
                    windowToFocus = window;
                }
            });
        }

        if (!windowToFocus && this._minimizedWindows.length > 0) {
            for (const window of this._minimizedWindows) {
                if (window && window.get_compositor_private()) {
                    windowToFocus = window;
                    break;
                }
            }
        }

        if (windowToFocus) {
            this._activateWindowSmart(windowToFocus);
            
            GLib.timeout_add(GLib.PRIORITY_DEFAULT, 300, () => {
                if (global.display.get_focus_window() !== windowToFocus) {
                    this._doWindowActivation(windowToFocus, global.get_current_time());
                }
                return GLib.SOURCE_REMOVE;
            });
        }

        this._minimizedWindows = [];
    }

    _addButtonPulseEffect() {
        this._indicator.ease({
            scale_x: 0.95,
            scale_y: 0.95,
            duration: 100,
            mode: Clutter.AnimationMode.EASE_OUT_CUBIC,
            onComplete: () => {
                this._indicator.ease({
                    scale_x: 1.0,
                    scale_y: 1.0,
                    duration: 100,
                    mode: Clutter.AnimationMode.EASE_IN_CUBIC
                });
            }
        });
    }

    _toggleWindows() {
        if (this._animationTimeoutId) return;

        this._addButtonPulseEffect();

        if (this._minimizedWindows.length > 0) {
            this._processWindowList([...this._minimizedWindows], 'unminimize');
        } else {
            const allWorkspaces = this._settings.get_boolean('include-all-workspaces');
            let windowsToFilter;

            if (allWorkspaces) {
                windowsToFilter = global.display.list_all_windows();
            } else {
                windowsToFilter = global.workspace_manager.get_active_workspace().list_windows();
            }

            const excludeOnTop = this._settings.get_boolean('exclude-always-on-top');
            this._minimizedWindows = windowsToFilter.filter(w =>
                w && w.get_compositor_private() && w.can_minimize() && !w.minimized && !w.is_skip_taskbar() &&
                w.get_window_type() === Meta.WindowType.NORMAL &&
                !(excludeOnTop && w.is_above())
            );

            this._processWindowList([...this._minimizedWindows], 'minimize');
        }
        this._updateState();
    }

    _addToPanel() {
        log('Home Button Extension: adding indicator to panel');
        // Remove from any previous parent safely
        try {
            this._indicator.get_parent()?.remove_child(this._indicator);
        } catch (e) {
            log(`Home Button: failed to remove indicator from parent (safe ignore): ${e}`);
        }
        const position = this._settings.get_string('button-position');
        const posMap = {
            left: Main.panel._leftBox,
            center: Main.panel._centerBox,
            right: Main.panel._rightBox,
        };
        let targetBox = posMap[position];
        // Add compatibility: accept non-underscored statusArea if available
        if (!Main.panel._leftBox && Main.panel.leftBox) {
            posMap.left = Main.panel.leftBox;
        }
        if (!Main.panel._centerBox && Main.panel.centerBox) {
            posMap.center = Main.panel.centerBox;
        }
        if (!Main.panel._rightBox && Main.panel.rightBox) {
            posMap.right = Main.panel.rightBox;
        }
        // Also ensure we can use 'statusArea' accessor as fallback
        const statusAreaCandidate = Main.panel.statusArea || Main.panel._statusArea || Main.panel.statusAreaBox;
        if (!targetBox) {
            log(`Home Button Extension: configured position '${position}' not found — using fallback`);
            // Prefer center, then right, then left
            targetBox = Main.panel._centerBox || Main.panel._rightBox || Main.panel._leftBox || statusAreaCandidate;
        }
        if (!targetBox) {
            log('Home Button Extension: Could not find a target panel box to insert indicator; aborting addToPanel');
            return;
        }
        // Try to get a friendly name for the target box for logs. If not available, print type.
        let boxInfo = 'unknown';
        try {
            if (typeof targetBox.get_name === 'function') {
                boxInfo = `${targetBox.get_name()}`;
            } else if (typeof targetBox.constructor === 'function') {
                boxInfo = targetBox.constructor.name;
            }
        } catch (_) {
            boxInfo = `${targetBox}`;
        }
        log(`Home Button Extension: inserting into box: ${boxInfo}`);
        try {
            const children = targetBox.get_children ? targetBox.get_children() : [];
            const index = children.length;
            targetBox.insert_child_at_index(this._indicator, index);
            log(`Home Button Extension: inserted at index ${index} into ${boxInfo}`);
        } catch (e) {
            log(`Home Button Extension: failed to insert at index; falling back to add_child: ${e}`);
            try {
                targetBox.add_child(this._indicator);
            } catch (err) {
                log(`Home Button Extension: failed to add child to target box: ${err}`);
            }
        }
        log(`Home Button Extension: indicator parent after insert: ${this._indicator.get_parent()}`);

        // Additional diagnostics for the icon
        try {
            const gicon = this._icon.get_gicon?.();
            log(`Home Button Extension: icon gicon type: ${gicon ? gicon.to_string?.() : 'none'}`);
            log(`Home Button Extension: icon size: ${this._icon.get_icon_size()}`);
        } catch (e) {
            log(`Home Button Extension: icon diagnostics failed: ${e}`);
        }
    }
}