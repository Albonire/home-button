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
	@echo "Gestor de la extensión Home Button"
	@echo "----------------------------------"
	@echo "Usa los siguientes comandos:"
	@echo "  make install        - Install the extension (or update)."
	@echo "  make uninstall      - Uninstall the extension."
	@echo "  make enable         - Activate extension."
	@echo "  make disable        - Desactivate extension."
	@echo "  make prefs          - Open extension preferences."
	@echo "  make compile-schema - Compile configuration schema."
	@echo "  make log            - Show GNOME shell extensions logs in real time."
	@echo "  make zip            - Crea un paquete .zip para subir a extensions.gnome.org."
	@echo "  make clean          - Elimina los archivos generados (como el .zip)."
	@echo ""
	@echo "IMPORTANTE: Para aplicar cambios, recarga GNOME Shell manualmente:"
	@echo "  1. Presiona Alt + F2"
	@echo "  2. Escribe 'r' en el diálogo"
	@echo "  3. Presiona Enter"

# Compila el schema de configuración
compile-schema:
	@echo "Compilando schema de configuración..."
	@mkdir -p $(SCHEMA_DIR)
	@cp schemas/$(SCHEMA_FILE) $(SCHEMA_DIR)/
	@glib-compile-schemas $(SCHEMA_DIR)
	@echo "Schema compilado correctamente."

# Instala la extensión copiando los archivos al directorio de GNOME
install: uninstall compile-schema
	@echo "Instalando extensión en: $(INSTALL_DIR)"
	@cp -r $(SRC_DIR) $(INSTALL_DIR)
	@echo "¡Instalación completa!"
	@echo "Para aplicar los cambios, recarga GNOME Shell (Alt+F2, 'r', Enter) y activa la extensión con 'make enable'."

# Desinstala la extensión eliminando su directorio
uninstall:
	@echo "Eliminando instalación anterior si existe..."
	@rm -rf $(INSTALL_DIR)

# Activa la extensión usando la herramienta de línea de comandos
enable:
	@echo "Activando extensión: $(UUID)"
	@gnome-extensions enable $(UUID)

# Desactiva la extensión
disable:
	@echo "Desactivando extensión: $(UUID)"
	@gnome-extensions disable $(UUID)

# Abre las preferencias de la extensión
prefs:
	@echo "Abriendo preferencias de la extensión..."
	@gnome-extensions prefs $(UUID)

# Muestra los logs del sistema para depurar la extensión
log:
	@echo "Mostrando logs de GNOME Shell... (Presiona Ctrl+C para salir)"
	@journalctl -f -o cat /usr/bin/gnome-shell

# Crea un archivo .zip listo para ser distribuido
zip: clean compile-schema
	@echo "Creando paquete de distribución: $(ZIP_FILE)"
	@cd $(SRC_DIR) && zip -r ../$(ZIP_FILE) . -x "*.git*" "*LICENSE*" "*README.md*"
	@mkdir -p temp-schemas
	@cp schemas/$(SCHEMA_FILE) temp-schemas/
	@cd temp-schemas && zip -r ../$(ZIP_FILE) $(SCHEMA_FILE)
	@rm -rf temp-schemas
	@echo "Paquete creado en $(ZIP_FILE)"

# Limpia los archivos generados
clean:
	@echo "Limpiando archivos generados..."
	@rm -f $(ZIP_FILE)
	@echo "Limpieza completada."