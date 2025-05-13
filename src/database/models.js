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
  @field('f_impuesto') f_impuesto;
  @field('f_base_imponible') f_base_imponible;
  @field('f_descuento') f_descuento;
}
export class FacturaPedido extends Model {
  static table = 't_factura_pedido';
  @field('f_cliente') f_cliente;
  @text('f_documento') f_documento;
  @text('f_tipodoc') f_tipodoc;
  @field('f_nodoc') f_nodoc;
  @text('f_fecha') f_fecha;
  @text('f_hora_vendedor') f_hora_vendedor;
  @field('f_monto_bruto') f_monto_bruto;
  @field('f_monto') f_monto;
  @field('f_itbis') f_itbis;
  @field('f_descuento') f_descuento;
  @field('f_porc_descuento') f_porc_descuento;
  @field('f_condicion') f_condicion;
  @field('f_observacion') f_observacion;
  @field('f_vendedor') f_vendedor;
  @field('f_estado_pedido') f_estado_pedido;
  @field('f_enviado') f_enviado;
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

export class Bancos extends Model {
  static table = 't_bancos';
  @field('f_idbanco') f_idbanco;
  @text('f_nombre') f_nombre;
  @field('f_cooperativa') f_cooperativa;
}

export class RecibosPDA extends Model {
  static table = 't_recibos_pda2';
  @text('f_documento') f_documento;
  @text('f_tiporecibo') f_tiporecibo;
  @field('f_norecibo') f_norecibo;
  @field('f_monto') f_monto;
  @text('f_fecha') f_fecha;
  @text('f_concepto') f_concepto;
  @field('f_idcliente') f_idcliente;
  @field('f_cobrador') f_cobrador;
  @field('f_efectivo') f_efectivo;
  @field('f_monto_transferencia') f_monto_transferencia;
  @field('f_cheque') f_cheque;
  @field('f_cheque_numero') f_cheque_numero;
  @field('f_cheque_banco') f_cheque_banco;
  @field('f_banco_transferencia') f_banco_transferencia;
  @field('f_cheque_recibido') f_cheque_recibido;
  @field('f_cheque_cobro') f_cheque_cobro;
  @field('f_estado') f_estado;
  @field('f_enviado') f_enviado;
}
export class Aplicaciones_pda extends Model {
  static table = 't_aplicaciones_pda2';
  @text('f_documento_aplico') f_documento_aplico;
  @text('f_documento_aplicado') f_documento_aplicado;
  @field('f_tipo_doc') f_tipo_doc;
  @text('f_concepto') f_concepto;
  @field('f_monto') f_monto;
  @text('f_fecha') f_fecha;
  @field('f_cliente') f_cliente;
  @field('f_balance') f_balance;
}
export class DescuentosxPago extends Model {
  static table = 't_desc_x_pago_cliente';
  @field('f_cliente') f_cliente;
  @field('f_dia_inicio') f_dia_inicio;
  @field('f_dia_fin') f_dia_fin;
  @field('f_descuento1') f_descuento1;
}
export class OfertaProductos extends Model {
  static table = 't_productos_ofertas';
  @field('f_referencia') f_referencia;
  @field('f_referencia_oferta') f_referencia_oferta;
  @field('f_cantidad_req') f_cantidad_req;
  @field('f_cantidad') f_cantidad;
}
export class NotaCredito extends Model {
  static table = 't_nota_credito_venta_pda2';
  @text('f_documento') f_documento
  @text('f_tipo') f_tipo
  @field('f_nodoc') f_nodoc
  @field('f_monto') f_monto
  @text('f_fecha') f_fecha
  @text('f_concepto') f_concepto
  @field('f_tipo_nota') f_tipo_nota
  @text('f_factura') f_factura
  @text('f_ncf') f_ncf //Este es el documento de las devoluciones, en el sistema ARPA se usa con este nombre
  @field('f_porc') f_porc
  @field('f_aprobado') f_aprobado
  @field('f_anulado') f_anulado
  @field('f_enviado') f_enviado
  @text('f_documento_principal') f_documento_principal
}

export class Devolucion extends Model {
  static table = 't_factura_dev_pda';
  @text('f_documento') f_documento
  @text('f_tipo') f_tipo
  @field('f_nodoc') f_nodoc
  @field('f_monto') f_monto
  @field('f_itbis') f_itbis
  @text('f_fecha') f_fecha
  @text('f_hora') f_hora
  @field('f_hechopor') f_hechopor
  @field('f_vendedor') f_vendedor
  @text('f_pedido') f_pedido
  @field('f_cliente') f_cliente
  @field('f_monto_excento') f_monto_excento
  @field('f_base_imponible') f_base_imponible
  @field('f_monto_bruto') f_monto_bruto
  @text('f_observacion') f_observacion
  @text('f_concepto') f_concepto
  @field('f_enviado') f_enviado
}

export class DetalleDevolucion extends Model {
  static table = 't_detalle_factura_dev_pda';
  @text('f_documento') f_documento
  @text('f_tipo') f_tipo
  @field('f_nodoc') f_nodoc
  @field('f_referencia') f_referencia
  @field('f_precio') f_precio
  @field('f_cantidad') f_cantidad
  @field('f_itbis') f_itbis
}

export class EstadoDev extends Model{
  static table = 't_estado_dev';
  @field('f_id') f_id
  @text('f_descripcion') f_descripcion
}












