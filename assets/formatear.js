
export function formatear(valor){
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(valor);
  }