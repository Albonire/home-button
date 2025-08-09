'use strict';

import St from 'gi://St';
import Gio from 'gi://Gio';
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


    // VERSIÓN DE EMERGENCIA - Reemplazar temporalmente tu _toggleWindows()
// Esta versión incluye MUCHO debugging

_toggleWindows() {
    console.log("🚀 Home-Button: _toggleWindows() iniciado");
    
    try {
        if (this._minimizedWindows.length > 0) {
            console.log(`📤 Restaurando ${this._minimizedWindows.length} ventanas`);
            [...this._minimizedWindows].reverse().forEach((window, index) => {
                if (window.get_workspace()) {
                    console.log(`  Restaurando: ${window.get_title()}`);
                    window.unminimize();
                    window.raise();
                }
            });
            this._minimizedWindows = [];
        } else {
            console.log("📥 Iniciando minimización...");
            
            const workspaceManager = global.workspace_manager;
            const includeAllWorkspaces = this._settings.get_boolean('include-all-workspaces');
            
            console.log(`   Include all workspaces: ${includeAllWorkspaces}`);
            
            let windowsToConsider = [];
            if (includeAllWorkspaces) {
                const nWorkspaces = workspaceManager.get_n_workspaces();
                console.log(`   Analizing ${nWorkspaces} workspaces`);
                for (let i = 0; i < nWorkspaces; i++) {
                    const workspace = workspaceManager.get_workspace_by_index(i);
                    const workspaceWindows = workspace.list_windows();
                    console.log(`   Workspace ${i}: ${workspaceWindows.length} ventanas`);
                    windowsToConsider.push(...workspaceWindows);
                }
            } else {
                const activeWorkspace = workspaceManager.get_active_workspace();
                windowsToConsider = activeWorkspace.list_windows();
                console.log(`   Actual workspace: ${windowsToConsider.length} windows`);
            }

            console.log(`  Total windows found: ${windowsToConsider.length}`);

            // filters
            this._minimizedWindows = windowsToConsider.filter(w => {
                if (!w) {
                    console.log("   ❌ Null window");
                    return false;
                }
                
                const title = w.get_title() || "No title";
                const isMinimized = w.minimized;
                
                console.log(`   🔍 Parsing: "${title}" - Minimized: ${isMinimized}`);
                
                if (isMinimized) {
                    console.log(`   ⏭️  Skipping "${title}" (already minimized)`);
                    return false;
                }
                
                console.log(`   ✅ "${title}" will be minimized`);
                return true;
            });

            console.log(`🎯 Windows to minimize: ${this._minimizedWindows.length}`);

            if (this._minimizedWindows.length === 0) {
                console.log("⚠️  No windows to minimize.");
            } else {
                // MINIMIZATION simple
                this._minimizedWindows.forEach((window, index) => {
                    const title = window.get_title() || "Sin título";
                    console.log(`  🔽 Minimizing: "${title}"`);
                    
                    try {
                        window.minimize();
                        console.log(`    ✅ "${title}" correctly minimized`);
                    } catch (error) {
                        console.log(`    ❌ Error minimizing "${title}": ${error}`);
                    }
                });
            }
        }
    } catch (e) {
        console.error(`🚨 Home-Button Extension: Error en _toggleWindows(): ${e}`);
        console.error(`🚨 Stack trace: ${e.stack}`);
        this._minimizedWindows = [];
    }
    
    console.log("🏁 _toggleWindows() completado");
    
    setTimeout(() => {
        console.log("🔄 Updating state...");
        this._updateState();
    }, 200);
}

_restoreWindows() {
    [...this._minimizedWindows].reverse().forEach(window => {
        if (window.get_workspace()) {
            try {
                if (window.minimized) {
                    window.unminimize();
                } else {
                    window.show();
                }
                window.raise();
            } catch (error) {
                console.log(`Error restoring window: ${error}`);
            }
        }
    });
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
    console.log("🚀 Home Button Extension enabled");
    
    try {
        console.log("📋 Loading settings...");
        this._settings = this.getSettings();
        console.log("✅ Settings loaded");

        console.log("🎨 Creating indicator...");
        this._indicator = new St.Bin({
            reactive: true,
            can_focus: true,
            track_hover: true,
            name: 'home-button-indicator',
            style_class: 'panel-button',
        });
        console.log("✅ Indicator created");

        console.log("🖼️ Creating icon...");
        this._icon = new St.Icon({
            style_class: 'home-button-icon',
        });
        console.log("✅ Icon created");

        this._indicator.set_child(this._icon);
        console.log("✅ Icon added to indicator");

        console.log("🖱️ Connecting event listeners...");
        
        const buttonPressConnection = this._indicator.connect('button-press-event', (actor, event) => {
            console.log("🖱️ Button pressed");
            console.log(`   Button: ${event.get_button()}`);
            console.log(`   Primary button: ${Clutter.BUTTON_PRIMARY}`);
            
            if (event.get_button() === Clutter.BUTTON_PRIMARY) {
                console.log("✅ Click valid - executing _toggleWindows()");
                this._toggleWindows();
                return Clutter.EVENT_STOP;
            } else {
                console.log("⏭️ Click ignored (not primary button)");
            }
            return Clutter.EVENT_PROPAGATE;
        });
        console.log(`✅ Button-press-event conected (ID: ${buttonPressConnection})`);

        const keyPressConnection = this._indicator.connect('key-press-event', (actor, event) => {
            console.log("⌨️ key pressed");
            const symbol = event.get_key_symbol();
            console.log(`   Key: ${symbol}`);
            
            if (symbol === Clutter.KEY_Return || symbol === Clutter.KEY_space) {
                console.log("✅ Valid key - executing _toggleWindows()");
                this._toggleWindows();
                return Clutter.EVENT_STOP;
            }
            return Clutter.EVENT_PROPAGATE;
        });
        console.log(`✅ Key-press-event conected (ID: ${keyPressConnection})`);

        this._indicator.connect('enter-event', () => {
            console.log(" Mouse entered the button");
        });
        
        this._indicator.connect('leave-event', () => {
            console.log(" Mouse came out of the button");
        });

        console.log(" Charging stylesheet...");
        const themeContext = St.ThemeContext.get_for_stage(global.stage);
        const stylesheetFile = Gio.File.new_for_path(this.path + '/stylesheet.css');
        if (stylesheetFile.query_exists(null)) {
            this._stylesheet = stylesheetFile;
            themeContext.get_theme().load_stylesheet(this._stylesheet);
            console.log(" Stylesheet loaded");
        } else {
            console.log(" Stylesheet not found");
        }

        console.log(" Conecting settings...");
        this._connectSettings();
        console.log(" Settings conected");

        console.log(" Adding to panel...");
        this._addToPanel();
        console.log(" Added to panel");

        console.log(" Applying icon size...");
        this._applyIconSize();
        console.log(" Size applied");

        console.log(" Updating initial status...");
        this._updateState();
        console.log(" Updated status");

        console.log(" Home Button Extension enabled succesfully");
        
        // TEST: add timeout
        setTimeout(() => {
            console.log("   TEST: Checking status after 2 seconds...");
            console.log(`   Indicator exists: ${!!this._indicator}`);
            console.log(`   Icon exists: ${!!this._icon}`);
            console.log(`   Settings exists: ${!!this._settings}`);
            
            // funcionality test
            if (this._indicator && this._indicator.reactive) {
                console.log("✅ Indicator is reactive and ready for clicks");
            } else {
                console.log("❌ PROBLEM: Indicator is not reactive");
            }
        }, 2000);
        
    } catch (error) {
        console.error(` ERROR en enable(): ${error}`);
        console.error(` Stack trace: ${error.stack}`);
    }
}

    disable() {
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
        console.log('Home Button Extension disabled');
    }
}

