#!/usr/bin/env node

/**
 * Script de utilidad para verificar la configuración de la impresora
 *
 * Uso:
 *   node scripts/check-printer.js
 */

import { exec } from "child_process";
import { promisify } from "util";
import { existsSync } from "fs";
import { join } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const RESET = "\x1b[0m";
const BRIGHT = "\x1b[1m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const RED = "\x1b[31m";
const BLUE = "\x1b[34m";

function log(message, color = "") {
  console.log(`${color}${message}${RESET}`);
}

function getPlatform() {
  const platform = process.platform;
  if (platform === "linux") return "linux";
  if (platform === "win32") return "windows";
  return "unknown";
}

async function checkLinuxPrinters() {
  try {
    log("\n📋 Verificando impresoras en Linux...", BLUE);

    // Verificar si CUPS está instalado
    try {
      await execAsync("which lpstat");
      log("✓ CUPS está instalado", GREEN);
    } catch {
      log("✗ CUPS no está instalado", RED);
      log("  Instala CUPS: sudo apt-get install cups", YELLOW);
      return;
    }

    // Listar impresoras
    try {
      const { stdout: printersList } = await execAsync(
        "lpstat -p 2>/dev/null || lpstat -a 2>/dev/null",
      );

      if (printersList.trim()) {
        log("\n📌 Impresoras disponibles:", BRIGHT);
        const printers = printersList.split("\n").filter((line) => line.trim());
        printers.forEach((printer) => {
          console.log(`  ${printer}`);
        });
      } else {
        log("✗ No hay impresoras configuradas", YELLOW);
        log("  Configura una impresora en: http://localhost:631", BLUE);
      }
    } catch (error) {
      log("✗ No se pudieron listar las impresoras", RED);
    }

    // Verificar impresora predeterminada
    try {
      const { stdout: defaultPrinter } = await execAsync(
        "lpstat -d 2>/dev/null",
      );
      if (defaultPrinter.includes("system default destination")) {
        log("\n✓ Impresora predeterminada:", GREEN);
        console.log(`  ${defaultPrinter.trim()}`);
      } else {
        log("\n⚠ No hay impresora predeterminada configurada", YELLOW);
      }
    } catch {
      log("\n⚠ No hay impresora predeterminada configurada", YELLOW);
    }
  } catch (error) {
    log(`✗ Error al verificar impresoras: ${error.message}`, RED);
  }
}

async function checkWindowsPrinters() {
  try {
    log("\n📋 Verificando impresoras en Windows...", BLUE);

    // Listar impresoras
    const { stdout: printersList } = await execAsync(
      'powershell -Command "Get-Printer | Select-Object Name, DriverName, PortName, PrinterStatus | Format-Table -AutoSize"',
    );

    if (printersList.trim()) {
      log("\n📌 Impresoras disponibles:", BRIGHT);
      console.log(printersList);
    } else {
      log("✗ No hay impresoras configuradas", YELLOW);
    }

    // Verificar impresora predeterminada
    try {
      const { stdout: defaultPrinter } = await execAsync(
        'powershell -Command "Get-WmiObject -Class Win32_Printer | Where-Object { $_.Default -eq $true } | Select-Object -ExpandProperty Name"',
      );
      if (defaultPrinter.trim()) {
        log("✓ Impresora predeterminada:", GREEN);
        console.log(`  ${defaultPrinter.trim()}`);
      } else {
        log("⚠ No hay impresora predeterminada configurada", YELLOW);
      }
    } catch {
      log("⚠ No hay impresora predeterminada configurada", YELLOW);
    }
  } catch (error) {
    log(`✗ Error al verificar impresoras: ${error.message}`, RED);
  }
}

async function checkPDFFile() {
  const pdfPath = join(
    __dirname,
    "..",
    "apps",
    "server",
    "to-print",
    "to-print.pdf",
  );

  log("\n📄 Verificando archivo PDF...", BLUE);

  if (existsSync(pdfPath)) {
    log(`✓ Archivo encontrado: ${pdfPath}`, GREEN);
  } else {
    log(`✗ Archivo no encontrado: ${pdfPath}`, RED);
    log(
      "  Asegúrate de colocar el PDF en: apps/server/to-print/to-print.pdf",
      YELLOW,
    );
  }
}

async function checkEnvFile() {
  const envPath = join(__dirname, "..", "apps", "server", ".env");

  log("\n⚙️  Verificando configuración...", BLUE);

  if (existsSync(envPath)) {
    log(`✓ Archivo .env encontrado`, GREEN);

    // Leer variables de entorno
    const { readFileSync } = await import("fs");
    const envContent = readFileSync(envPath, "utf-8");

    const printerNameMatch = envContent.match(/PRINTER_NAME=(.+)/);
    const pdfPathMatch = envContent.match(/PDF_PATH=(.+)/);

    if (printerNameMatch && printerNameMatch[1].trim()) {
      log(`  PRINTER_NAME: ${printerNameMatch[1].trim()}`, BRIGHT);
    } else {
      log("  PRINTER_NAME: (usando impresora predeterminada)", YELLOW);
    }

    if (pdfPathMatch && pdfPathMatch[1].trim()) {
      log(`  PDF_PATH: ${pdfPathMatch[1].trim()}`, BRIGHT);
    } else {
      log("  PDF_PATH: (usando ruta predeterminada)", YELLOW);
    }
  } else {
    log(`⚠ Archivo .env no encontrado`, YELLOW);
    log("  Crea el archivo .env en: apps/server/.env", BLUE);
    log(
      "  Puedes copiar el ejemplo: cp apps/server/.env.example apps/server/.env",
      BLUE,
    );
  }
}

async function main() {
  console.log("\n");
  log("═══════════════════════════════════════════════", BRIGHT);
  log("  🖨️  Verificación de Configuración de Impresora", BRIGHT);
  log("═══════════════════════════════════════════════", BRIGHT);

  const platform = getPlatform();
  log(`\n🖥️  Sistema operativo: ${platform}`, BRIGHT);

  if (platform === "linux") {
    await checkLinuxPrinters();
  } else if (platform === "windows") {
    await checkWindowsPrinters();
  } else {
    log(`\n✗ Sistema operativo no soportado: ${process.platform}`, RED);
  }

  await checkPDFFile();
  await checkEnvFile();

  log("\n═══════════════════════════════════════════════", BRIGHT);
  log("  📚 Para más información, consulta:", BRIGHT);
  log("     docs/PRINTER-SETUP.md", BLUE);
  log("═══════════════════════════════════════════════", BRIGHT);
  console.log("\n");
}

main().catch((error) => {
  log(`\n✗ Error: ${error.message}`, RED);
  process.exit(1);
});
