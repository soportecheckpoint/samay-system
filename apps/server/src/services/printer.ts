import { exec } from "child_process";
import { promisify } from "util";
import { existsSync } from "fs";
import { logger } from "../utils/logger.js";

const execAsync = promisify(exec);

/**
 * Detecta el sistema operativo actual
 */
function getPlatform(): "linux" | "windows" | "unknown" {
  const platform = process.platform;
  if (platform === "linux") return "linux";
  if (platform === "win32") return "windows";
  return "unknown";
}

/**
 * Imprime un PDF en Linux usando lp o lpr
 */
async function printPDFOnLinux(
  pdfPath: string,
  printerName?: string,
): Promise<void> {
  const printerArg = printerName ? `-d ${printerName}` : "";

  try {
    // Intentar con lp primero (CUPS)
    const lpCommand = `lp ${printerArg} "${pdfPath}"`;
    logger.info(`[PRINTER] Ejecutando comando: ${lpCommand}`);

    const { stdout, stderr } = await execAsync(lpCommand);

    if (stderr) {
      logger.warn(`[PRINTER] Advertencia: ${stderr}`);
    }

    if (stdout) {
      logger.info(`[PRINTER] Resultado: ${stdout.trim()}`);
    }

    logger.info(`[PRINTER] PDF enviado a la impresora exitosamente (Linux)`);
  } catch (error: any) {
    // Si lp falla, intentar con lpr
    try {
      const lprCommand = printerName
        ? `lpr -P ${printerName} "${pdfPath}"`
        : `lpr "${pdfPath}"`;

      logger.info(`[PRINTER] Intentando con lpr: ${lprCommand}`);

      const { stdout, stderr } = await execAsync(lprCommand);

      if (stderr) {
        logger.warn(`[PRINTER] Advertencia: ${stderr}`);
      }

      if (stdout) {
        logger.info(`[PRINTER] Resultado: ${stdout.trim()}`);
      }

      logger.info(
        `[PRINTER] PDF enviado a la impresora exitosamente usando lpr (Linux)`,
      );
    } catch (lprError: any) {
      logger.error(
        `[PRINTER] Error al imprimir con lp y lpr: ${error.message}, ${lprError.message}`,
      );
      throw new Error(
        `No se pudo imprimir el PDF. Asegúrate de que CUPS esté instalado y la impresora configurada.`,
      );
    }
  }
}

/**
 * Imprime un PDF en Windows usando comando print o PowerShell
 */
async function printPDFOnWindows(
  pdfPath: string,
  printerName?: string,
): Promise<void> {
  try {
    // Usar PowerShell para imprimir en Windows
    const printerArg = printerName ? `-PrinterName "${printerName}"` : "";

    // Comando PowerShell para imprimir PDF
    const psCommand = `Start-Process -FilePath "${pdfPath}" -Verb Print ${printerArg ? `-ArgumentList "${printerName}"` : ""} -WindowStyle Hidden`;
    const command = `powershell -Command "${psCommand}"`;

    logger.info(`[PRINTER] Ejecutando comando: ${command}`);

    const { stdout, stderr } = await execAsync(command);

    if (stderr) {
      logger.warn(`[PRINTER] Advertencia: ${stderr}`);
    }

    if (stdout) {
      logger.info(`[PRINTER] Resultado: ${stdout.trim()}`);
    }

    logger.info(`[PRINTER] PDF enviado a la impresora exitosamente (Windows)`);
  } catch (error: any) {
    logger.error(`[PRINTER] Error al imprimir en Windows: ${error.message}`);
    throw new Error(
      `No se pudo imprimir el PDF. Asegúrate de que la impresora esté configurada correctamente en Windows.`,
    );
  }
}

/**
 * Lista las impresoras disponibles en el sistema
 */
export async function listPrinters(): Promise<string[]> {
  const platform = getPlatform();

  try {
    if (platform === "linux") {
      const { stdout } = await execAsync(
        "lpstat -p -d 2>/dev/null || lpstat -a 2>/dev/null",
      );
      const printers = stdout
        .split("\n")
        .filter((line) => line.trim())
        .map((line) => {
          const match = line.match(/printer (\S+)|(\S+) accepting/);
          return match ? match[1] || match[2] : null;
        })
        .filter(Boolean) as string[];

      return printers;
    } else if (platform === "windows") {
      const { stdout } = await execAsync(
        'powershell -Command "Get-Printer | Select-Object -ExpandProperty Name"',
      );
      const printers = stdout
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);

      return printers;
    }
  } catch (error: any) {
    logger.warn(
      `[PRINTER] No se pudieron listar las impresoras: ${error.message}`,
    );
  }

  return [];
}

/**
 * Imprime un PDF en la impresora configurada
 *
 * @param pdfPath - Ruta absoluta al archivo PDF
 * @param printerName - Nombre de la impresora (opcional, usa la impresora por defecto si no se especifica)
 */
export async function printPDF(
  pdfPath: string,
  printerName?: string,
): Promise<void> {
  // Validar que el archivo existe
  if (!existsSync(pdfPath)) {
    const error = `El archivo PDF no existe: ${pdfPath}`;
    logger.error(`[PRINTER] ${error}`);
    throw new Error(error);
  }

  const platform = getPlatform();
  logger.info(`[PRINTER] Plataforma detectada: ${platform}`);
  logger.info(`[PRINTER] Imprimiendo PDF: ${pdfPath}`);
  if (printerName) {
    logger.info(`[PRINTER] Impresora: ${printerName}`);
  } else {
    logger.info(`[PRINTER] Usando impresora por defecto`);
  }

  try {
    if (platform === "linux") {
      await printPDFOnLinux(pdfPath, printerName);
    } else if (platform === "windows") {
      await printPDFOnWindows(pdfPath, printerName);
    } else {
      throw new Error(`Sistema operativo no soportado: ${process.platform}`);
    }
  } catch (error: any) {
    logger.error(`[PRINTER] Error al imprimir: ${error.message}`);
    throw error;
  }
}

/**
 * Obtiene información sobre las impresoras disponibles
 */
export async function getPrinterInfo(): Promise<{
  platform: string;
  printers: string[];
  defaultPrinter: string | null;
}> {
  const platform = getPlatform();
  const printers = await listPrinters();

  let defaultPrinter: string | null = null;

  try {
    if (platform === "linux") {
      const { stdout } = await execAsync("lpstat -d 2>/dev/null");
      const match = stdout.match(/system default destination: (\S+)/);
      defaultPrinter = match ? match[1] : null;
    } else if (platform === "windows") {
      const { stdout } = await execAsync(
        'powershell -Command "Get-WmiObject -Class Win32_Printer | Where-Object { $_.Default -eq $true } | Select-Object -ExpandProperty Name"',
      );
      defaultPrinter = stdout.trim() || null;
    }
  } catch (error: any) {
    logger.warn(
      `[PRINTER] No se pudo obtener la impresora por defecto: ${error.message}`,
    );
  }

  return {
    platform,
    printers,
    defaultPrinter,
  };
}
