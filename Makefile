UUID = home-button@Albonire.github.io

SRC_DIR = $(UUID)

INSTALL_DIR = $(HOME)/.local/share/gnome-shell/extensions/$(UUID)

SCHEMA_DIR = $(HOME)/.local/share/glib-2.0/schemas
SCHEMA_FILE = org.gnome.shell.extensions.home-button.gschema.xml

ZIP_FILE = $(UUID).zip

.DEFAULT_GOAL := help

.PHONY: help install uninstall enable disable log zip clean compile-schema prefs create-icon-dir

help:
	@echo "Home Button extension Manager"
	@echo "----------------------------------"
	@echo "Use the following commands:"
	@echo "  make install        - Install the extension (or update)."
	@echo "  make uninstall      - Uninstall the extension."
	@echo "  make enable         - Activate extension."
	@echo "  make disable        - Desactivate extension."
	@echo "  make prefs          - Open extension preferences."
	@echo "  make compile-schema - Compile configuration schema."
	@echo "  make create-icon-dir- Create icons directory for custom icons."
	@echo "  make log            - Show GNOME shell extensions logs in real time."
	@echo "  make zip            - Create a zip file to upload to extensions.gnome.org."
	@echo "  make clean          - Delete generated files (like the .zip)."
	@echo ""
	@echo "IMPORTANT: To apply changes, manually reload GNOME Shell:"
	@echo "  1. Press Alt + F2"
	@echo "  2. Type 'r' in the text field."
	@echo "  3. Press enter"

create-icon-dir:
	@echo "Creating icons directory..."
	@mkdir -p $(SRC_DIR)/icons
	@echo "Icons directory created at $(SRC_DIR)/icons"
	@echo "Place your home-symbolic.svg file there for the default icon."

compile-schema:
	@echo "Compiling schema configuration for system and extension directories..."
	@mkdir -p $(SCHEMA_DIR)
	@cp $(SRC_DIR)/schemas/$(SCHEMA_FILE) $(SCHEMA_DIR)/
	@glib-compile-schemas $(SCHEMA_DIR)
	@echo "Global schema compilation completed."

	@echo "Compiling schema inside the extension folder to produce local gschemas.compiled..."
	@glib-compile-schemas $(SRC_DIR)/schemas
	@echo "Local extension schema compilation completed."

install: uninstall compile-schema
	@echo "Installing extension in: $(INSTALL_DIR)"
	@cp -r $(SRC_DIR) $(INSTALL_DIR)
	@mkdir -p $(INSTALL_DIR)/schemas
	@# If local gschemas.compiled exists after compiling, copy it into the installed extension
	@if [ -f $(SRC_DIR)/schemas/gschemas.compiled ]; then \
		cp $(SRC_DIR)/schemas/gschemas.compiled $(INSTALL_DIR)/schemas/; \
	fi
	@echo "¡Installation complete!"
	@echo "To apply the changes, reload GNOME Shell (Alt+F2, 'r', Enter - on x11, or manual reload otherwise) and activate the extension with 'make enable'."

uninstall:
	@echo "Removing previous installation if it exists..."
	@rm -rf $(INSTALL_DIR)
	@echo "Removing per-user compiled schemas used for the extension..."
	@if [ -f $(SCHEMA_DIR)/gschemas.compiled ]; then \
		glib-compile-schemas $(SCHEMA_DIR) > /dev/null 2>&1 || true; \
	fi

enable:
	@echo "Activating extension: $(UUID)"
	@gnome-extensions enable $(UUID)

disable:
	@echo "Disabling extension: $(UUID)"
	@gnome-extensions disable $(UUID)

prefs:
	@echo "Opening extension pref..."
	@gnome-extensions prefs $(UUID)

log:
	@echo "Displaying GNOME Shell logs... (Presiona Ctrl+C para salir)"
	@journalctl -f -o cat /usr/bin/gnome-shell

zip: clean
	@echo "Creating distribution zip: $(ZIP_FILE)"
	@cd $(SRC_DIR) && zip -r ../$(ZIP_FILE) . -x "*/.git*" "*LICENSE*" "*README.md*"
	@echo "Zip created in $(ZIP_FILE)"

clean:
	@echo "Cleaning generated files..."
	@rm -f $(ZIP_FILE)
	@echo "Clean completed."
