
export function formatear(valor){
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(valor);
  }

export function formatearFecha(date) {
  const d = date instanceof Date ? date : new Date(date);
  const day   = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year  = d.getFullYear();
  return `${day}/${month}/${year}`; // dd/mm/yyyy
}
