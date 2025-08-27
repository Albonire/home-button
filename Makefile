# Makefile para el desarrollo de la Extensión de GNOME Shell "Home Button"

# El UUID es el identificador único. ¡Debe coincidir con metadata.json y el nombre del directorio!
UUID = home-button@fabian.github.io

# Directorio fuente del proyecto
SRC_DIR = $(UUID)

# Directorio de instalación de extensiones de GNOME Shell para el usuario local
INSTALL_DIR = $(HOME)/.local/share/gnome-shell/extensions/$(UUID)

# Directorio de schemas
SCHEMA_DIR = $(HOME)/.local/share/glib-2.0/schemas
SCHEMA_FILE = org.gnome.shell.extensions.home-button.gschema.xml

# Nombre del archivo ZIP para distribución
ZIP_FILE = $(UUID).zip

# El objetivo por defecto será 'help' para mostrar los comandos disponibles
.DEFAULT_GOAL := help

# Evita que 'make' se confunda si existe un archivo con el mismo nombre que un target
.PHONY: help install uninstall enable disable log zip clean compile-schema prefs

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
	@echo "  make log            - Show GNOME shell extensions logs in real time."
	@echo "  make zip            - Create a zip file to uplead to extensions.gnome.org."
	@echo "  make clean          - Delete generated files (like the .zip)."
	@echo ""
	@echo "IMPORTANTE: Para aplicar cambios, recarga GNOME Shell manualmente:"
	@echo "  1. Presiona Alt + F2"
	@echo "  2. Escribe 'r' en el diálogo"
	@echo "  3. Presiona Enter"

compile-schema:
	@echo "Compiling schema configuration..."
	@mkdir -p $(SCHEMA_DIR)
	@cp schemas/$(SCHEMA_FILE) $(SCHEMA_DIR)/
	@glib-compile-schemas $(SCHEMA_DIR)
	@echo "Schema correctly compiled."

install: uninstall compile-schema
	@echo "Installing extension in: $(INSTALL_DIR)"
	@cp -r $(SRC_DIR) $(INSTALL_DIR)
	@echo "¡Installation complete!"
	@echo "To apply the changes, reload GNOME Shell (Alt+F2, 'r', Enter - on x11, or manual reload otherwise) and activate the extension with 'make enable'.."

uninstall:
	@echo "Removing previous installation if it exists..."
	@rm -rf $(INSTALL_DIR)

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

zip: clean compile-schema
	@echo "Creating distribution zip: $(ZIP_FILE)"
	@cd $(SRC_DIR) && zip -r ../$(ZIP_FILE) . -x "*.git*" "*LICENSE*" "*README.md*"
	@mkdir -p temp-schemas
	@cp schemas/$(SCHEMA_FILE) temp-schemas/
	@cd temp-schemas && zip -r ../$(ZIP_FILE) $(SCHEMA_FILE)
	@rm -rf temp-schemas
	@echo "Zip created in $(ZIP_FILE)"

clean:
	@echo "Cleaning generated files..."
	@rm -f $(ZIP_FILE)
	@echo "Clean completed."