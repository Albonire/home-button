'use strict';

import St from 'gi://St';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import Meta from 'gi://Meta';
import Clutter from 'gi://Clutter';
import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';

export default class HomeButtonExtension extends Extension {
    constructor(metadata) {
        super(metadata);
        this._indicator = null;
        this._icon = null;
        this._minimizedWindows = [];
        this._settings = null;
        this._animationTimeoutId = null;
        this._isAnimatingIcon = false;
        this._currentIconState = 'home'; // 'home' or 'restore'
    }

    enable() {
        this._settings = this.getSettings();

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

        this._indicator.connect('button-press-event', (actor, event) => {
            if (event.get_button() === Clutter.BUTTON_PRIMARY) {
                this._toggleWindows();
            }
            return Clutter.EVENT_PROPAGATE;
        });

        this._settingsConnections = new Map();
        this._connectSettings();

        this._addToPanel();
        this._updateIconSize();
        this._updateIconPath();
        this._updateState();
    }

    disable() {
        if (this._animationTimeoutId) {
            GLib.Source.remove(this._animationTimeoutId);
            this._animationTimeoutId = null;
        }

        // Clear any ongoing icon animations
        if (this._isAnimatingIcon) {
            this._icon.remove_all_transitions();
            this._isAnimatingIcon = false;
        }

        this._settingsConnections.forEach(id => this._settings.disconnect(id));
        this._settingsConnections.clear();

        this._indicator?.destroy();
        this._indicator = null;
        this._icon = null;
        this._minimizedWindows = [];
        this._settings = null;
    }

    _connectSettings() {
        const keys = ['button-position', 'icon-size', 'icon-path', 'show-count-in-tooltip'];
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
        const size = this._settings.get_double('icon-size');
        this._icon.set_icon_size(size);
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
            iconPath = this._getDefaultIconPath();
        } else {
            iconPath = userIconPath;
        }

        try {
            if (GLib.path_is_absolute(iconPath) && GLib.file_test(iconPath, GLib.FileTest.EXISTS)) {
                const file = Gio.File.new_for_path(iconPath);
                this._icon.set_gicon(new Gio.FileIcon({ file: file }));
            } else {
                this._icon.set_gicon(Gio.icon_new_for_string(iconPath));
            }
        } catch (e) {
            console.warn(`Home Button Extension: Failed to load icon "${iconPath}", using fallback: ${e.message}`);
            this._icon.set_gicon(Gio.icon_new_for_string('user-home-symbolic'));
        }
    }

    _animateIconTransition(newIconCallback, targetState) {
        if (this._isAnimatingIcon || this._currentIconState === targetState) {
            return;
        }

        this._isAnimatingIcon = true;
        const ANIMATION_DURATION = 200; // milliseconds
        
        // Phase 1: Fade out current icon
        this._icon.ease({
            opacity: 0,
            duration: ANIMATION_DURATION / 2,
            mode: Clutter.AnimationMode.EASE_OUT_CUBIC,
            onComplete: () => {
                // Phase 2: Change icon and fade in
                newIconCallback();
                this._currentIconState = targetState;
                
                this._icon.ease({
                    opacity: 255,
                    duration: ANIMATION_DURATION / 2,
                    mode: Clutter.AnimationMode.EASE_IN_CUBIC,
                    onComplete: () => {
                        this._isAnimatingIcon = false;
                    }
                });
            }
        });
    }

    _updateState() {
        const hasMinimized = this._minimizedWindows.length > 0;
        const showCount = this._settings.get_boolean('show-count-in-tooltip');

        if (hasMinimized && this._currentIconState !== 'restore') {
            // Animate to restore icon
            this._animateIconTransition(() => {
                this._icon.set_gicon(Gio.icon_new_for_string('view-restore-symbolic'));
            }, 'restore');
            
            this._indicator.tooltip_text = showCount
                ? `Restore ${this._minimizedWindows.length} window${this._minimizedWindows.length !== 1 ? 's' : ''}`
                : 'Restore windows';
            this._indicator.add_style_class_name('minimized-mode');
            
        } else if (!hasMinimized && this._currentIconState !== 'home') {
            // Animate to home icon
            this._animateIconTransition(() => {
                this._updateIconPath();
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

    _processWindowList(windows, action) {
        const delay = this._settings.get_int('animation-delay');
        if (delay === 0) {
            windows.forEach(win => {
                if (win?.get_compositor_private()) {
                    action === 'minimize' ? win.minimize() : win.unminimize();
                }
            });
            if (action === 'unminimize') this._minimizedWindows = [];
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
            
            if (action === 'unminimize') this._minimizedWindows = [];
            this._animationTimeoutId = null;
            this._updateState();
            return GLib.SOURCE_REMOVE;
        });
    }

    _addButtonPulseEffect() {
        // Add a subtle pulse effect when clicked
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

        // Add button press effect
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
                w && w.can_minimize() && !w.minimized && !w.is_skip_taskbar() &&
                w.get_window_type() === Meta.WindowType.NORMAL &&
                !(excludeOnTop && w.is_above())
            );

            this._processWindowList([...this._minimizedWindows], 'minimize');
        }
        this._updateState();
    }

    _addToPanel() {
        this._indicator.get_parent()?.remove_child(this._indicator);
        const position = this._settings.get_string('button-position');
        const posMap = {
            left: Main.panel._leftBox,
            center: Main.panel._centerBox,
            right: Main.panel._rightBox,
        };
        (posMap[position] || Main.panel._rightBox).insert_child_at_index(this._indicator, 0);
    }
}