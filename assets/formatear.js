
export function formatear(valor){
    return new Intl.NumberFormat('en-US').format(valor);
  }

export function formatearFecha(date) {
  const d = date instanceof Date ? date : new Date(date);
  const day   = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year  = d.getFullYear();
  return `${day}/${month}/${year}`; // dd/mm/yyyy
}

export function formatearFechaRec(fecha) {
  if (typeof fecha === 'string') {
    const [day, month, year] = fecha.split('/');
    // Validación básica
    if (!day || !month || !year) {
      throw new Error(`Fecha inválida: ${fecha}`);
    }
    return `${year}/${month.padStart(2, '0')}/${day.padStart(2, '0')}`;
  }

  // Si viene como Date (o cualquier otro input válido para new Date)
  const d = fecha instanceof Date ? fecha : new Date(fecha);
  if (isNaN(d)) {
    throw new Error(`Fecha inválida: ${fecha}`);
  }
  const yyyy = d.getFullYear();
  const mm   = String(d.getMonth() + 1).padStart(2, '0');
  const dd   = String(d.getDate()).padStart(2, '0');
  return `${yyyy}/${mm}/${dd}`;

}


/**
 * Convierte un número a su representación en letras en español (sin librerías externas).
 * Soporta hasta millones y decimales de dos dígitos.
 */

// Mapas básicos
const UNIDADES = ['cero','uno','dos','tres','cuatro','cinco','seis','siete','ocho','nueve',
  'diez','once','doce','trece','catorce','quince','dieciseis','diecisiete','dieciocho','diecinueve'];
const DECENAS = ['','diez','veinte','treinta','cuarenta','cincuenta','sesenta','setenta','ochenta','noventa'];
const CENTENAS = ['','ciento','doscientos','trescientos','cuatrocientos','quinientos','seiscientos','setecientos','ochocientos','novecientos'];

/**
 * Convierte un número de 0 a 999 a texto.
 * @param {number} n - Entero entre 0 y 999
 * @returns {string}
 */
function tresDigitos(n) {
  let texto = '';
  if (n === 0) return '';
  if (n === 100) return 'cien';
  const c = Math.floor(n / 100);
  const resto = n % 100;
  if (c > 0) {
    texto += CENTENAS[c] + ' ';
  }
  if (resto < 20) {
    texto += UNIDADES[resto];
  } else {
    const d = Math.floor(resto / 10);
    const u = resto % 10;
    if (d === 2 && u > 0) {
      texto += 'veinti' + UNIDADES[u];
    } else {
      texto += DECENAS[d];
      if (u > 0) texto += ' y ' + UNIDADES[u];
    }
  }
  return texto.trim();
}

export function formatNumberToWords(monto, options = {}) {
  // Opciones de moneda y centavos
  const { plural = 'PESOS', singular = 'PESO', centPlural = 'CENTAVOS', centSingular = 'CENTAVO' } = options;

  // Parseo
  const num = (typeof monto === 'string') ? parseFloat(monto.replace(',', '.')) : monto;
  if (isNaN(num)) throw new Error(`Monto inválido: ${monto}`);

  const integerPart = Math.floor(Math.abs(num));
  const cents = Math.round((Math.abs(num) - integerPart) * 100);

  // Partes de millón y miles
  const millones = Math.floor(integerPart / 1000000);
  const miles = Math.floor((integerPart % 1000000) / 1000);
  const cientos = integerPart % 1000;

  let resultado = '';

  if (millones > 0) {
    if (millones === 1) resultado += 'un millon ';
    else resultado += tresDigitos(millones) + ' millones ';
  }
  if (miles > 0) {
    if (miles === 1) resultado += 'mil ';
    else resultado += tresDigitos(miles) + ' mil ';
  }
  if (cientos > 0) {
    resultado += tresDigitos(cientos) + ' ';
  }

  if (resultado === '') resultado = 'cero ';

  // Moneda singular/plural
  resultado += (integerPart === 1 ? singular : plural);

  // Centavos
  resultado += ' con ';
  if (cents === 0) {
    resultado += 'cero ' + centPlural;
  } else {
    resultado += tresDigitos(cents) + ' ' + (cents === 1 ? centSingular : centPlural);
  }

  return resultado.trim().toUpperCase();
}


export function wrapText(text, maxLength = 32) {
  const words = text.split(' ');
  const lines = [];
  let currentLine = '';

  for (const word of words) {
    // Si añade la palabra cabrá en la línea actual
    if ((currentLine + (currentLine ? ' ' : '') + word).length <= maxLength) {
      currentLine = currentLine ? `${currentLine} ${word}` : word;
    } else {
      // Empuja la línea actual
      if (currentLine) lines.push(currentLine);
      // Si la palabra sola excede el maxLength, partiéndola
      if (word.length > maxLength) {
        for (let i = 0; i < word.length; i += maxLength) {
          lines.push(word.slice(i, i + maxLength));
        }
        currentLine = '';
      } else {
        currentLine = word;
      }
    }
  }
  // Añade la última línea
  if (currentLine) lines.push(currentLine);
  return lines;
}


