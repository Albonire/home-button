'use strict';

import Adw from 'gi://Adw';
import Gio from 'gi://Gio';
import Gtk from 'gi://Gtk';

// Corrected imports - removed problematic gettext import
import { ExtensionPreferences } from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

export default class HomeButtonPreferences extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        const page = new Adw.PreferencesPage({
            title: 'General',
            icon_name: 'dialog-information-symbolic',
        });
        window.add(page);

        // Grupo de apariencia
        const appearanceGroup = new Adw.PreferencesGroup({
            title: 'Appearance',
            description: 'Customize the look and position of the home button',
        });
        page.add(appearanceGroup);

        // button position
        const positionRow = new Adw.ComboRow({
            title: 'Button Position',
            subtitle: 'Where to place the button in the top panel',
        });
        
        const positionModel = new Gtk.StringList();
        positionModel.append('Left');
        positionModel.append('Center');
        positionModel.append('Right');
        positionRow.model = positionModel;
        
        appearanceGroup.add(positionRow);

        const iconSizeAdjustment = new Gtk.Adjustment({
            lower: 16,
            upper: 32,
            step_increment: 2,
            page_increment: 4,
            value: 24,
        });
        
        const iconSizeRow = new Adw.SpinRow({
            title: 'Icon Size',
            subtitle: 'Size of the home button icon in pixels',
            adjustment: iconSizeAdjustment,
            digits: 0,
        });
        appearanceGroup.add(iconSizeRow);

        const behaviorGroup = new Adw.PreferencesGroup({
            title: 'Behavior',
            description: 'Configure how the home button works',
        });
        page.add(behaviorGroup);

        const animationAdjustment = new Gtk.Adjustment({
            lower: 0,
            upper: 200,
            step_increment: 5,
            page_increment: 10,
            value: 35,
        });
        
        const animationDelayRow = new Adw.SpinRow({
            title: 'Animation Delay',
            subtitle: 'Milliseconds between minimizing each window (0 = instant)',
            adjustment: animationAdjustment,
            digits: 0,
        });
        behaviorGroup.add(animationDelayRow);

        // Incluir todos los workspaces
        const allWorkspacesRow = new Adw.SwitchRow({
            title: 'All Workspaces',
            subtitle: 'Minimize/restore windows from all workspaces instead of just current',
        });
        behaviorGroup.add(allWorkspacesRow);

        // Excluir ventanas always-on-top
        const excludeOnTopRow = new Adw.SwitchRow({
            title: 'Exclude Always-on-Top',
            subtitle: 'Skip windows that are set to always stay on top',
        });
        behaviorGroup.add(excludeOnTopRow);

        // Mostrar conteo en tooltip
        const showCountRow = new Adw.SwitchRow({
            title: 'Show Window Count',
            subtitle: 'Display number of minimized windows in button tooltip',
        });
        behaviorGroup.add(showCountRow);

        // Grupo de información
        const infoGroup = new Adw.PreferencesGroup({
            title: 'About',
        });
        page.add(infoGroup);

        const aboutRow = new Adw.ActionRow({
            title: 'Home Button Extension',
            subtitle: 'A smart desktop toggle for GNOME Shell',
        });
        
        const linkButton = new Gtk.LinkButton({
            label: 'GitHub Repository',
            uri: 'https://github.com/Albonire/home-button',
            valign: Gtk.Align.CENTER,
        });
        aboutRow.add_suffix(linkButton);
        infoGroup.add(aboutRow);

        // Conectar settings
        const settings = this.getSettings();

        // Posición del botón
        const currentPosition = settings.get_string('button-position');
        const positions = ['left', 'center', 'right'];
        positionRow.selected = positions.indexOf(currentPosition);
        
        positionRow.connect('notify::selected', () => {
            const selectedPosition = positions[positionRow.selected];
            settings.set_string('button-position', selectedPosition);
        });

        // Otras configuraciones usando bind
        settings.bind('button-icon-size', iconSizeRow, 'value', Gio.SettingsBindFlags.DEFAULT);
        settings.bind('animation-delay', animationDelayRow, 'value', Gio.SettingsBindFlags.DEFAULT);
        settings.bind('include-all-workspaces', allWorkspacesRow, 'active', Gio.SettingsBindFlags.DEFAULT);
        settings.bind('exclude-always-on-top', excludeOnTopRow, 'active', Gio.SettingsBindFlags.DEFAULT);
        settings.bind('show-count-in-tooltip', showCountRow, 'active', Gio.SettingsBindFlags.DEFAULT);
    }
}