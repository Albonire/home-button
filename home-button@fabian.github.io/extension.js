'use strict';

import St from 'gi://St';
import Gio from 'gi://Gio';
import Clutter from 'gi://Clutter';
import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';

export default class HomeButtonExtension extends Extension {
    constructor(metadata) {
        super(metadata);
        this._indicator = null;
        this._icon = null;
        this._stylesheet = null;
        this._minimizedWindows = [];
        this._settings = null;
        this._buttonPosition = 'right'; // 'left', 'center', 'right'
    }

    _updateState() {
        const hasMinimized = this._minimizedWindows.length > 0;

        if (hasMinimized) {
            this._icon.icon_name = 'view-restore-symbolic';
            this._indicator.tooltip_text = `Restaurar ${this._minimizedWindows.length} ventana(s)`;
            this._indicator.add_style_class_name('minimized-mode');
        } else {
            this._icon.icon_name = 'user-home-symbolic'; // Icono más apropiado
            this._indicator.tooltip_text = 'Minimizar todas las ventanas';
            this._indicator.remove_style_class_name('minimized-mode');
        }
    }

    _toggleWindows() {
        try {
            if (this._minimizedWindows.length > 0) {
                this._minimizedWindows.forEach(window => {
                    if (window.get_workspace()) {
                        window.unminimize();
                    }
                });
                this._minimizedWindows = [];
            } else {
                const workspaceManager = global.workspace_manager;
                const activeWorkspace = workspaceManager.get_active_workspace();
                const windows = activeWorkspace.list_windows();
                this._minimizedWindows = windows.filter(w => w.can_minimize() && !w.minimized);
                this._minimizedWindows.forEach(window => {
                    window.minimize();
                });
            }
        } catch (e) {
            log(`Home-Button Extension: Error toggling windows: ${e}`);
            this._minimizedWindows = [];
        }
        this._updateState();
    }

    _addToPanel() {
        switch (this._buttonPosition) {
            case 'left':
                Main.panel._leftBox.insert_child_at_index(this._indicator, 0);
                break;
            case 'center':
                Main.panel._centerBox.insert_child_at_index(this._indicator, 0);
                break;
            case 'right':
            default:
                Main.panel._rightBox.insert_child_at_index(this._indicator, 0);
                break;
        }
    }

    enable() {
        this._indicator = new St.Bin({
            reactive: true,
            can_focus: true,
            track_hover: true,
            name: 'home-button-indicator', // ID for CSS
        });

        this._icon = new St.Icon({
            style_class: 'system-status-icon',
        });

        this._indicator.set_child(this._icon);

        this._indicator.connect('button-press-event', () => this._toggleWindows());

        this._indicator.connect('key-press-event', (actor, event) => {
            const symbol = event.get_key_symbol();
            if (symbol === Clutter.KEY_Return || symbol === Clutter.KEY_space) {
                this._toggleWindows();
                return Clutter.EVENT_STOP;
            }
            return Clutter.EVENT_PROPAGATE;
        });

        // Load custom stylesheet
        const themeContext = St.ThemeContext.get_for_stage(global.stage);
        const stylesheetFile = Gio.File.new_for_path(this.path + '/stylesheet.css');
        if (stylesheetFile.query_exists(null)) {
            this._stylesheet = stylesheetFile;
            themeContext.get_theme().load_stylesheet(this._stylesheet);
        }

        this._addToPanel();
        this._updateState();
    }

    disable() {
        // Unload custom stylesheet
        if (this._stylesheet) {
            St.ThemeContext.get_for_stage(global.stage).get_theme().unload_stylesheet(this._stylesheet);
            this._stylesheet = null;
        }

        if (this._indicator) {
            // We need to find the parent to remove the child
            const parent = this._indicator.get_parent();
            if (parent) {
                parent.remove_child(this._indicator);
            }
            this._indicator.destroy();
            this._indicator = null;
            this._icon = null;
        }
        this._minimizedWindows = [];
    }
}
