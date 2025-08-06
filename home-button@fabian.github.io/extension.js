'use strict';

import St from 'gi://St';
import Gio from 'gi://Gio';
import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';

export default class HomeButtonExtension extends Extension {
    constructor(metadata) {
        super(metadata);
        this._indicator = null;
        this._icon = null;
        this._stylesheet = null;
        this._minimizedWindows = [];
    }

    _updateState() {
        if (this._minimizedWindows.length > 0) {
            this._icon.icon_name = 'view-restore-symbolic';
            this._indicator.tooltip_text = 'Restaurar ventanas';
        } else {
            this._icon.icon_name = 'go-home-symbolic';
            this._indicator.tooltip_text = 'Minimizar ventanas';
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

        this._indicator.connect('button-press-event', () => {
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
        });

        // Load custom stylesheet
        const themeContext = St.ThemeContext.get_for_stage(global.stage);
        const stylesheetFile = Gio.File.new_for_path(this.path + '/stylesheet.css');
        if (stylesheetFile.query_exists(null)) {
            this._stylesheet = stylesheetFile;
            themeContext.get_theme().load_stylesheet(this._stylesheet);
        }

        Main.panel._rightBox.insert_child_at_index(this._indicator, 0);
        this._updateState();
    }

    disable() {
        // Unload custom stylesheet
        if (this._stylesheet) {
            St.ThemeContext.get_for_stage(global.stage).get_theme().unload_stylesheet(this._stylesheet);
            this._stylesheet = null;
        }

        if (this._indicator) {
            Main.panel._rightBox.remove_child(this._indicator);
            this._indicator.destroy();
            this._indicator = null;
            this._icon = null;
        }
        this._minimizedWindows = [];
    }
}
