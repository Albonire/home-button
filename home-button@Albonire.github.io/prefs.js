'use strict';

import Adw from 'gi://Adw';
import Gio from 'gi://Gio';
import Gtk from 'gi://Gtk';
import { ExtensionPreferences } from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

export default class HomeButtonPreferences extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        try {
            this._settings = this.getSettings();
        } catch (e) {
            // If the schema is not compiled/installed, show a helpful message in the prefs
            log(`Home Button Preferences: Failed to load settings: ${e}`);
            const page = new Adw.PreferencesPage();
            window.add(page);
            const errorGroup = new Adw.PreferencesGroup({ title: 'Settings unavailable' });
            page.add(errorGroup);
            const errorMessage = new Adw.ActionRow({ title: 'Unable to load settings', subtitle: 'Please run make install or run glib-compile-schemas for your user schemas.' });
            errorGroup.add(errorMessage);
            return;
        }
        this._window = window;

        const page = new Adw.PreferencesPage();
        window.add(page);

        const appearanceGroup = new Adw.PreferencesGroup({
            title: 'Appearance',
            description: 'Customize the look and position of the home button.',
        });
        page.add(appearanceGroup);

        const iconRow = new Adw.ActionRow({
            title: 'Custom Icon',
            subtitle: 'Choose a custom icon file.',
        });
        appearanceGroup.add(iconRow);

        const iconButton = new Gtk.Button({
            label: 'Browse...',
            valign: Gtk.Align.CENTER,
        });
        iconRow.add_suffix(iconButton);
        iconRow.activatable_widget = iconButton;
        iconButton.connect('clicked', () => this._selectIcon());

        const iconSizeRow = new Adw.SpinRow({
            title: 'Icon Size',
            subtitle: 'Size of the icon in pixels.',
            adjustment: new Gtk.Adjustment({ lower: 16, upper: 64, step_increment: 1 }),
            digits: 0,
        });
        appearanceGroup.add(iconSizeRow);

        const positionRow = new Adw.ComboRow({
            title: 'Button Position',
            subtitle: 'Where to place the button in the top panel.',
            model: Gtk.StringList.new(['Left', 'Center', 'Right']),
        });
        appearanceGroup.add(positionRow);

        // Behavior Group
        const behaviorGroup = new Adw.PreferencesGroup({
            title: 'Behavior',
            description: 'Configure how the home button works.',
        });
        page.add(behaviorGroup);

        const animationDelayRow = new Adw.SpinRow({
            title: 'Animation Delay',
            subtitle: 'Milliseconds between minimizing each window (0 = instant).',
            adjustment: new Gtk.Adjustment({ lower: 0, upper: 200, step_increment: 5 }),
            digits: 0,
        });
        behaviorGroup.add(animationDelayRow);

        const allWorkspacesRow = new Adw.SwitchRow({
            title: 'All Workspaces',
            subtitle: 'Minimize/restore windows from all workspaces.',
        });
        behaviorGroup.add(allWorkspacesRow);

        const excludeOnTopRow = new Adw.SwitchRow({
            title: 'Exclude Always-on-Top',
            subtitle: 'Skip windows that are set to always stay on top.',
        });
        behaviorGroup.add(excludeOnTopRow);

        const showCountRow = new Adw.SwitchRow({
            title: 'Show Window Count',
            subtitle: 'Display number of minimized windows in the tooltip.',
        });
        behaviorGroup.add(showCountRow);

        // Reset Group
        const resetGroup = new Adw.PreferencesGroup({
            title: 'Reset',
        });
        page.add(resetGroup);

        const resetRow = new Adw.ActionRow({
            title: 'Reset All Settings',
            subtitle: 'Restore settings to their default values.',
        });
        resetGroup.add(resetRow);

        const resetButton = new Gtk.Button({
            label: 'Reset',
            valign: Gtk.Align.CENTER,
        });
        resetButton.add_css_class('destructive-action');
        resetRow.add_suffix(resetButton);
        resetRow.activatable_widget = resetButton;
        resetButton.connect('clicked', () => this._showResetDialog());

        // About Group
        const aboutGroup = new Adw.PreferencesGroup({
            title: 'About',
        });
        page.add(aboutGroup);

        const aboutRow = new Adw.ActionRow({
            title: 'Home Button Extension',
            subtitle: 'A smart desktop toggle for GNOME Shell',
        });
        aboutGroup.add(aboutRow);

        const linkButton = new Gtk.LinkButton({
            label: 'GitHub Repository',
            uri: 'https://github.com/Albonire/home-button',
            valign: Gtk.Align.CENTER,
        });
        aboutRow.add_suffix(linkButton);

        this._settings.bind('icon-size', iconSizeRow, 'value', Gio.SettingsBindFlags.DEFAULT);
        this._settings.bind('animation-delay', animationDelayRow, 'value', Gio.SettingsBindFlags.DEFAULT);
        this._settings.bind('include-all-workspaces', allWorkspacesRow, 'active', Gio.SettingsBindFlags.DEFAULT);
        this._settings.bind('exclude-always-on-top', excludeOnTopRow, 'active', Gio.SettingsBindFlags.DEFAULT);
        this._settings.bind('show-count-in-tooltip', showCountRow, 'active', Gio.SettingsBindFlags.DEFAULT);

        const currentPosition = this._settings.get_string('button-position');
        const positions = ['left', 'center', 'right'];
        positionRow.selected = positions.indexOf(currentPosition);
        positionRow.connect('notify::selected', () => {
            this._settings.set_string('button-position', positions[positionRow.selected]);
        });
    }

    _selectIcon() {
        const dialog = new Gtk.FileChooserDialog({
            title: 'Select an Icon',
            transient_for: this._window,
            modal: true,
            action: Gtk.FileChooserAction.OPEN,
        });
        const filter = new Gtk.FileFilter();
        filter.add_pixbuf_formats();
        dialog.set_filter(filter);
        dialog.add_button('Cancel', Gtk.ResponseType.CANCEL);
        dialog.add_button('Select', Gtk.ResponseType.ACCEPT);
        dialog.connect('response', (dlg, response) => {
            if (response === Gtk.ResponseType.ACCEPT) {
                this._settings.set_string('icon-path', dialog.get_file().get_path());
            }
            dialog.destroy();
        });
        dialog.show();
    }

    _showResetDialog() {
        const dialog = new Adw.MessageDialog({
            heading: 'Reset Settings?',
            body: 'All settings will be restored to their default values.',
            transient_for: this._window,
            modal: true,
        });
        dialog.add_response('cancel', 'Cancel');
        dialog.add_response('reset', 'Reset');
        dialog.set_response_appearance('reset', Adw.ResponseAppearance.DESTRUCTIVE);
        dialog.connect('response', (dlg, response) => {
            if (response === 'reset') {
                this._settings.list_keys().forEach(key => this._settings.reset(key));
            }
        });
        dialog.present();
    }
}
