'use strict';

import St from 'gi://St';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import Meta from 'gi://Meta';
import Clutter from 'gi://Clutter';
import { Extension, gettext as _ } from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';

export default class HomeButtonExtension extends Extension {
    constructor(metadata) {
        super(metadata);
        this._indicator = null;
        this._icon = null;
        this._stylesheet = null;
        this._minimizedWindows = [];
        this._settings = null;
        this._settingsConnections = new Map();
        this._animationTimeoutId = null;
    }

    _updateState() {
        const hasMinimized = this._minimizedWindows.length > 0;
        const showCount = this._settings.get_boolean('show-count-in-tooltip');

        if (hasMinimized) {
            this._icon.icon_name = 'view-restore-symbolic';
            this._indicator.tooltip_text = showCount 
                ? _(`Restore ${this._minimizedWindows.length} window${this._minimizedWindows.length !== 1 ? 's' : ''}`)
                : _('Restore windows');
            this._indicator.add_style_class_name('minimized-mode');
        } else {
            this._icon.icon_name = 'user-home-symbolic';
            this._indicator.tooltip_text = _('Minimizar todas las ventanas y mostrar escritorio');
            this._indicator.remove_style_class_name('minimized-mode');
        }
    }

    _processWindowList(windows, action) {
        const delay = this._settings.get_int('animation-delay');

        if (delay === 0) {
            windows.forEach(win => {
                if (win.get_compositor_private()) {
                    if (action === 'minimize') win.minimize();
                    else win.unminimize();
                }
            });
            return;
        }

        let i = 0;
        const process = () => {
            if (i < windows.length) {
                const win = windows[i];
                if (win.get_compositor_private()) {
                    if (action === 'minimize') win.minimize();
                    else win.unminimize();
                }
                i++;
                return GLib.SOURCE_CONTINUE; // Continue the timer
            } else {
                this._animationTimeoutId = null;
                return GLib.SOURCE_REMOVE; // Stop the timer
            }
        };

        this._animationTimeoutId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, delay, process);
    }

    _toggleWindows() {
        if (this._animationTimeoutId) {
            GLib.Source.remove(this._animationTimeoutId);
            this._animationTimeoutId = null;
        }

        if (this._minimizedWindows.length > 0) {
            this._processWindowList([...this._minimizedWindows], 'unminimize');
            this._minimizedWindows = [];
        } else {
            const settings = this.getSettings();
            const excludeOnTop = settings.get_boolean('exclude-always-on-top');
            const allWorkspaces = settings.get_boolean('include-all-workspaces');

            let windowsToFilter = [];
            if (allWorkspaces) {
                const workspaceManager = global.workspace_manager;
                const nWorkspaces = workspaceManager.get_n_workspaces();
                for (let i = 0; i < nWorkspaces; i++) {
                    const workspace = workspaceManager.get_workspace_by_index(i);
                    windowsToFilter.push(...workspace.list_windows());
                }
            } else {
                windowsToFilter = global.get_window_actors().map(a => a.meta_window);
            }

            this._minimizedWindows = windowsToFilter.filter(w => {
                if (!w || w.minimized || w.is_skip_taskbar()) {
                    return false;
                }
                if (w.get_window_type() !== Meta.WindowType.NORMAL) {
                    return false;
                }
                if (excludeOnTop && w.is_above()) {
                    return false;
                }
                return true;
            });

            this._processWindowList([...this._minimizedWindows], 'minimize');
        }

        this._updateState();
    }
    
    _addToPanel() {
        if (this._indicator) {
            const parent = this._indicator.get_parent();
            if (parent) {
                parent.remove_child(this._indicator);
            }
        }

        const position = this._settings.get_string('button-position');
        switch (position) {
            case 'left':
                Main.panel._leftBox.insert_child_at_index(this._indicator, 0);
                break;
            case 'center':
                Main.panel._centerBox.insert_child_at_index(this._indicator, 0);
                break;
            case 'right':
            default:
                const rightBox = Main.panel._rightBox;
                const insertIndex = Math.max(0, rightBox.get_n_children() - 2);
                rightBox.insert_child_at_index(this._indicator, insertIndex);
                break;
        }
    }

    _applyIconSize() {
        const iconSize = this._settings.get_int('button-icon-size');
        if (this._icon) {
            this._icon.style = `font-size: ${iconSize}px;`;
        }
    }

    _connectSettings() {
        const settingsToConnect = [
            'button-position',
            'button-icon-size',
            'show-count-in-tooltip'
        ];

        settingsToConnect.forEach(key => {
            const connection = this._settings.connect(`changed::${key}`, () => {
                if (key === 'button-position') {
                    this._addToPanel();
                } else if (key === 'button-icon-size') {
                    this._applyIconSize();
                } else {
                    this._updateState();
                }
            });
            this._settingsConnections.set(key, connection);
        });
    }

    _disconnectSettings() {
        this._settingsConnections.forEach((connection) => {
            this._settings.disconnect(connection);
        });
        this._settingsConnections.clear();
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
            style_class: 'home-button-icon',
        });

        this._indicator.set_child(this._icon);

        this._indicator.connect('button-press-event', (actor, event) => {
            if (event.get_button() === Clutter.BUTTON_PRIMARY) {
                this._toggleWindows();
                return Clutter.EVENT_STOP;
            }
            return Clutter.EVENT_PROPAGATE;
        });

        this._indicator.connect('key-press-event', (actor, event) => {
            const symbol = event.get_key_symbol();
            if (symbol === Clutter.KEY_Return || symbol === Clutter.KEY_space) {
                this._toggleWindows();
                return Clutter.EVENT_STOP;
            }
            return Clutter.EVENT_PROPAGATE;
        });

        const themeContext = St.ThemeContext.get_for_stage(global.stage);
        const stylesheetFile = Gio.File.new_for_path(this.path + '/stylesheet.css');
        if (stylesheetFile.query_exists(null)) {
            this._stylesheet = stylesheetFile;
            themeContext.get_theme().load_stylesheet(this._stylesheet);
        }

        this._connectSettings();
        this._addToPanel();
        this._applyIconSize();
        this._updateState();
    }

    disable() {
        if (this._animationTimeoutId) {
            GLib.Source.remove(this._animationTimeoutId);
            this._animationTimeoutId = null;
        }

        this._disconnectSettings();

        if (this._stylesheet) {
            St.ThemeContext.get_for_stage(global.stage).get_theme().unload_stylesheet(this._stylesheet);
            this._stylesheet = null;
        }

        if (this._indicator) {
            this._indicator.destroy();
            this._indicator = null;
        }
        
        this._icon = null;
        this._minimizedWindows = [];
        this._settings = null;
    }
}
