# Guía de Compilación - AnonPDF Versión en Español

## Requisitos Previos

Antes de compilar AnonPDF, asegúrese de tener:

### Software Requerido

- **JDK 17 o superior** - [Descargar](https://www.oracle.com/java/technologies/downloads/#java17)
- **Android SDK** - API 37 mínimo
- **Android Build Tools** - Versión 36 o superior
- **Git** - [Descargar](https://git-scm.com/)

### Hardware Recomendado

- **Procesador:** Intel i5 o superior (o equivalente)
- **RAM:** Mínimo 8 GB (16 GB recomendado)
- **Espacio en disco:** 10 GB disponibles
- **Conexión:** Internet de banda ancha

## Paso 1: Configurar el Entorno Android

### Windows

1. Descargar Android Studio desde [developer.android.com](https://developer.android.com/studio)
2. Ejecutar el instalador
3. Abrir Android Studio
4. Ir a **File** > **Settings** > **Appearance & Behavior** > **System Settings** > **Android SDK**
5. Instalar:
   - Android API 37
   - Android Build Tools 36.x.x
6. Anotar la ruta del SDK (p.ej., `C:\Users\Usuario\AppData\Local\Android\Sdk`)

### macOS

```bash
# Usando Homebrew
brew install --cask android-studio
brew install openjdk@17

# O descargar desde: https://developer.android.com/studio
```

### Linux

```bash
# Ubuntu/Debian
sudo apt-get update
sudo apt-get install openjdk-17-jdk android-studio

# Fedora/CentOS
sudo dnf install java-17-openjdk android-studio
```

## Paso 2: Clonar el Repositorio

```bash
# Clonar el repositorio
git clone https://github.com/Freddyto25/AnonPDF-Accesible.git

# Entrar en el directorio
cd AnonPDF-Accesible

# Cambiar a la rama de desarrollo
git checkout feature/spanish-accessibility
```

## Paso 3: Configurar el Archivo local.properties

1. En la raíz del proyecto, crear archivo `local.properties`:

**Windows:**
```properties
sdk.dir=C:\\Users\\Usuario\\AppData\\Local\\Android\\Sdk
```

**macOS:**
```properties
sdk.dir=/Users/Usuario/Library/Android/sdk
```

**Linux:**
```properties
sdk.dir=/home/usuario/Android/Sdk
```

## Paso 4: Compilación Debug (Desarrollo)

### Usando Gradle directamente

```bash
# En Windows
.\gradlew.bat assembleDebug

# En macOS/Linux
./gradlew assembleDebug
```

### Usando Android Studio

1. Abrir proyecto en Android Studio
2. Ir a **Build** > **Build Bundles / APK** > **Build APK(s)**
3. Esperar a que compile (puede tomar 5-10 minutos)
4. El APK estará en: `app/build/outputs/apk/debug/app-debug.apk`

### Resultado

El archivo APK se creará en:
```
app/build/outputs/apk/debug/app-debug.apk
```

## Paso 5: Compilación Release (Producción)

### Sin firma (para pruebas)

```bash
# En Windows
.\gradlew.bat assembleRelease

# En macOS/Linux
./gradlew assembleRelease
```

El APK sin firmar estará en:
```
app/build/outputs/apk/release/app-release-unsigned.apk
```

### Con firma (para Play Store)

#### 1. Crear certificado de firma (si no lo tiene)

```bash
# En Windows
keytool -genkey -v -keystore upload.jks -keyalg RSA -keysize 2048 -validity 10000 -alias upload

# En macOS/Linux
keytool -genkey -v -keystore upload.jks -keyalg RSA -keysize 2048 -validity 10000 -alias upload
```

Se pedirá:
- Contraseña del almacén (keystore)
- Datos personales
- Contraseña de la clave

#### 2. Crear archivo keystore.properties

Crear `keystore.properties` en la raíz del proyecto:

```properties
storeFile=/ruta/absoluta/a/upload.jks
storePassword=tu_contraseña_almacén
keyAlias=upload
keyPassword=tu_contraseña_clave
```

#### 3. Compilar versión firmada

```bash
# En Windows
.\gradlew.bat bundleRelease

# En macOS/Linux
./gradlew bundleRelease
```

El archivo AAB (para Play Store) estará en:
```
app/build/outputs/bundle/release/app-release.aab
```

## Paso 6: Instalar en Dispositivo

### Instalación en dispositivo conectado

```bash
# En Windows
.\gradlew.bat installDebug

# En macOS/Linux
./gradlew installDebug
```

### Instalación manual

```bash
# Conectar dispositivo vía USB
adb devices

# Instalar APK
adb install app/build/outputs/apk/debug/app-debug.apk

# O usando Android Studio:
# Ir a Run > Run 'app' (Shift+F10)
```

### Instalación en emulador

```bash
# Listar emuladores disponibles
emulator -list-avds

# Iniciar emulador
emulator -avd nombre_del_emulador

# Instalar en emulador
adb install app/build/outputs/apk/debug/app-debug.apk
```

## Paso 7: Pruebas de Accesibilidad

### Activar TalkBack

1. En el dispositivo/emulador: **Configuración** > **Accesibilidad** > **TalkBack**
2. Activar **TalkBack**
3. Permitir permisos necesarios

### Ejecutar pruebas

```bash
# Pruebas unitarias
./gradlew testDebugUnitTest

# Pruebas instrumentadas (requiere dispositivo/emulador)
./gradlew connectedDebugAndroidTest

# Todas las pruebas
./gradlew testDebugUnitTest connectedDebugAndroidTest
```

## Solución de Problemas Comunes

### "Android SDK not found"

```bash
# Verificar ubicación del SDK
echo $ANDROID_HOME

# Establecer variable de entorno (si es necesario)
# Windows: setx ANDROID_HOME "C:\path\to\Android\Sdk"
# macOS/Linux: export ANDROID_HOME=/path/to/Android/Sdk
```

### "Gradle daemon exceeded max memory"

Agregar a `gradle.properties`:
```properties
org.gradle.jvmargs=-Xmx2048m
```

### "No devices found"

```bash
# Verificar conexión USB
adb devices

# Si no aparece el dispositivo:
# 1. Activar "Depuración USB" en Configuración > Opciones de desarrollador
# 2. Reinstalar drivers USB
# 3. Reconectar dispositivo
```

### "Gradle build failed"

```bash
# Limpiar caché
./gradlew clean

# Forzar descarga de dependencias
./gradlew build --refresh-dependencies

# Reintentvar
./gradlew assembleDebug
```

## Compilación desde Línea de Comandos (Completa)

```bash
# 1. Clonar repositorio
git clone https://github.com/Freddyto25/AnonPDF-Accesible.git
cd AnonPDF-Accesible
git checkout feature/spanish-accessibility

# 2. Configurar SDK
echo "sdk.dir=/ruta/a/Android/Sdk" > local.properties

# 3. Compilar
./gradlew assembleDebug

# 4. Instalar
adb install app/build/outputs/apk/debug/app-debug.apk

# 5. Ejecutar
adb shell am start -n io.github.fanfeast.anonpdf/.MainActivity
```

## Verificación Post-Compilación

Después de compilar, verificar:

1. **Tamaño del APK:** Debe ser ~15 MB
2. **Funcionalidad básica:** Abrir PDF, leer, buscar
3. **Accesibilidad:** TalkBack funciona correctamente
4. **Traducción:** Interfaz en español
5. **Sin permisos de red:** Confirmar en Configuración

## Publicación en Play Store

1. Crear cuenta de desarrollador en Google Play Console
2. Crear nueva aplicación
3. Cargar archivo AAB (app-release.aab)
4. Completar ficha de información
5. Revisar y publicar

## Variables de Entorno Útiles

### Windows (cmd)
```batch
set ANDROID_HOME=C:\path\to\Android\Sdk
set JAVA_HOME=C:\path\to\jdk-17
set PATH=%PATH%;%ANDROID_HOME%\platform-tools;%JAVA_HOME%\bin
```

### macOS/Linux (bash/zsh)
```bash
export ANDROID_HOME=/path/to/Android/sdk
export JAVA_HOME=/path/to/jdk-17
export PATH=$PATH:$ANDROID_HOME/platform-tools:$JAVA_HOME/bin
```

## Recursos Adicionales

- [Android Developer Documentation](https://developer.android.com/docs)
- [Gradle Build System](https://gradle.org/)
- [Jetpack Compose](https://developer.android.com/jetpack/compose)
- [Google Play Console](https://play.google.com/console)

## Contacto y Soporte

Para problemas de compilación:
1. Verificar que cumplen todos los requisitos
2. Ejecutar `./gradlew clean build`
3. Revisar logs completos del error
4. Abrir issue en GitHub con detalles

## Licencia

AnonPDF es software de código abierto bajo licencia MIT.