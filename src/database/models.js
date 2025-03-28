import { Model } from '@nozbe/watermelondb';
import { field, text } from '@nozbe/watermelondb/decorators';

export class Producto extends Model {
  static table = 't_productos_sucursal';
  @field('f_referencia') f_referencia;
  @text('f_referencia_suplidor') f_referencia_suplidor;
  @text('f_descripcion') f_descripcion;
  @field('f_precio5') f_precio5;
  @field('f_existencia') f_existencia;
  @field('f_activo') f_activo;
}

export class Clientes extends Model {
  static table = 't_clientes';
  @field('f_id') f_id;
  @text('f_nombre') f_nombre;
  @text('f_d_municipio') f_d_municipio;
  @field('f_vendedor') f_vendedor;
  @field('f_zona') f_zona;
  @text('f_telefono') f_telefono;
  @field('f_telefono_pro') f_telefono_pro;
  @field('f_descuento_maximo') f_descuento_maximo;
  @field('f_descuento1') f_descuento1;
  @field('f_clasificacion') f_clasificacion;
  @text('f_direccion') f_direccion;
  @field('f_activo') f_activo;
  @text('f_cedula') f_cedula;
  @field('f_dias_aviso') f_dias_aviso;
  @field('f_bloqueo_credito') f_bloqueo_credito;
  @field('f_facturar_contra_entrega') f_facturar_contra_entrega;
  @field('f_bloqueo_ck') f_bloqueo_ck;
  @field('f_limite_credito') f_limite_credito;
  @field('f_termino') f_termino;
}

export class CuentaCobrar extends Model {
  static table = 't_cuenta_cobrar';
  @field('f_idcliente') f_idcliente;
  @text('f_documento') f_documento;
  @text('f_tipodoc') f_tipodoc;
  @field('f_nodoc') f_nodoc;
  @text('f_fecha') f_fecha;
  @text('f_fecha_vencimiento') f_fecha_vencimiento;
  @field('f_monto') f_monto;
  @field('f_balance') f_balance;
}
export class FacturaPedido extends Model {
  static table = 't_factura_pedido';
  @field('f_cliente') f_cliente;
  @text('f_documento') f_documento;
  @text('f_tipodoc') f_tipodoc;
  @field('f_nodoc') f_nodoc;
  @text('f_fecha') f_fecha;  
  @field('f_monto_bruto') f_monto_bruto;
  @field('f_monto') f_monto;  
  @field('f_itbis') f_itbis;
  @field('f_descuento') f_descuento;
  @field('f_porc_descuento') f_porc_descuento;
  @field('f_condicion') f_condicion;
  @field('f_observacion') f_observacion;
  @field('f_vendedor') f_vendedor;
  @field('f_estado_pedido') f_estado_pedido;
}

export class DetalleFacturaPedido extends Model {
  static table = 't_detalle_factura_pedido';
  @field('f_documento') f_documento;
  @field('f_referencia') f_referencia;
  @field('f_cantidad') f_cantidad;
  @field('f_precio') f_precio;
}

export class Sync extends Model {
  static table = 't_sync';
  @field('f_id') f_id;
  @field('f_fecha') f_fecha;
  @field('f_tabla') f_tabla;
}


