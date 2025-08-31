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

        this._icon = new St.Icon({ style_class: 'home-button-icon' });
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

    _updateIconPath() {
        const path = this._settings.get_string('icon-path');
        this._icon.set_gicon(Gio.icon_new_for_string(path));
    }

    _updateState() {
        const hasMinimized = this._minimizedWindows.length > 0;
        const showCount = this._settings.get_boolean('show-count-in-tooltip');

        if (hasMinimized) {
            this._icon.set_gicon(Gio.icon_new_for_string('view-restore-symbolic'));
            this._indicator.tooltip_text = showCount
                ? `Restore ${this._minimizedWindows.length} window${this._minimizedWindows.length !== 1 ? 's' : ''}`
                : 'Restore windows';
            this._indicator.add_style_class_name('minimized-mode');
        } else {
            this._updateIconPath(); // Restore user-defined icon
            this._indicator.tooltip_text = 'Minimize all windows and show desktop';
            this._indicator.remove_style_class_name('minimized-mode');
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

    _toggleWindows() {
        if (this._animationTimeoutId) return;

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