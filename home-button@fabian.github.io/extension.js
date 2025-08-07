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
            this._indicator.tooltip_text = `Restaurar ${this._minimizedWindows.length} ventana${this._minimizedWindows.length !== 1 ? 's' : ''}`;
            this._indicator.add_style_class_name('minimized-mode');
        } else {
            this._icon.icon_name = 'user-home-symbolic';
            this._indicator.tooltip_text = 'Minimizar todas las ventanas y mostrar escritorio';
            this._indicator.remove_style_class_name('minimized-mode');
        }
    }

    _toggleWindows() {
        try {
            if (this._minimizedWindows.length > 0) {
                // Restaurar ventanas en orden inverso para mantener el z-order
                [...this._minimizedWindows].reverse().forEach(window => {
                    if (window.get_workspace()) {
                        window.unminimize();
                        window.raise();
                    }
                });
                this._minimizedWindows = [];
            } else {
                const workspaceManager = global.workspace_manager;
                const activeWorkspace = workspaceManager.get_active_workspace();
                const windows = activeWorkspace.list_windows().filter(w => 
                    w.can_minimize() && 
                    !w.minimized && 
                    w.showing_on_its_workspace() &&
                    !w.is_skip_taskbar()
                );
                
                this._minimizedWindows = windows;
                
                // Minimizar con pequeños delays para animación más fluida
                windows.forEach((window, index) => {
                    setTimeout(() => {
                        if (window.get_workspace()) {
                            window.minimize();
                        }
                    }, index * 35); // 35ms entre cada ventana
                });
            }
        } catch (e) {
            console.error(`Home-Button Extension: Error toggling windows: ${e}`);
            this._minimizedWindows = [];
        }
        
        // Actualizar estado después de un breve delay
        setTimeout(() => this._updateState(), 200);
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
                // Insertar cerca del final pero antes de algunos elementos del sistema
                const rightBox = Main.panel._rightBox;
                const insertIndex = Math.max(0, rightBox.get_n_children() - 2);
                rightBox.insert_child_at_index(this._indicator, insertIndex);
                break;
        }
    }

    enable() {
        this._indicator = new St.Bin({
            reactive: true,
            can_focus: true,
            track_hover: true, // Dejar que el shell maneje el hover
            name: 'home-button-indicator',
            style_class: 'panel-button',
        });

        this._icon = new St.Icon({
            style_class: 'home-button-icon', // Usar clase personalizada
        });

        this._indicator.set_child(this._icon);

        // Conectar eventos
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

        // Cargar stylesheet personalizado
        const themeContext = St.ThemeContext.get_for_stage(global.stage);
        const stylesheetFile = Gio.File.new_for_path(this.path + '/stylesheet.css');
        if (stylesheetFile.query_exists(null)) {
            this._stylesheet = stylesheetFile;
            themeContext.get_theme().load_stylesheet(this._stylesheet);
        }

        this._addToPanel();
        this._updateState();

        console.log('Home Button Extension enabled');
    }

    disable() {
        // Descargar stylesheet personalizado
        if (this._stylesheet) {
            St.ThemeContext.get_for_stage(global.stage).get_theme().unload_stylesheet(this._stylesheet);
            this._stylesheet = null;
        }

        if (this._indicator) {
            const parent = this._indicator.get_parent();
            if (parent) {
                parent.remove_child(this._indicator);
            }
            this._indicator.destroy();
            this._indicator = null;
            this._icon = null;
        }
        
        this._minimizedWindows = [];
        console.log('Home Button Extension disabled');
    }
}
