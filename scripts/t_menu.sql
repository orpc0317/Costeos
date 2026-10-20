CREATE TABLE IF NOT EXISTS t_menu (
  indice VARCHAR(8) NOT NULL,
  nombre VARCHAR(80) NOT NULL,
  ruta VARCHAR(200) NOT NULL,
  PRIMARY KEY (indice)
);

CREATE TABLE IF NOT EXISTS t_menu_usuario (
  id INT NOT NULL AUTO_INCREMENT,
  usuario_id INT NOT NULL,
  indice VARCHAR(8) NOT NULL,
  consultar TINYINT(1) NOT NULL DEFAULT 0,
  agregar TINYINT(1) NOT NULL DEFAULT 0,
  modificar TINYINT(1) NOT NULL DEFAULT 0,
  eliminar TINYINT(1) NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  UNIQUE KEY t_menu_usuario_usuario_id_indice_key (usuario_id, indice),
  CONSTRAINT t_menu_usuario_usuario_fk FOREIGN KEY (usuario_id) REFERENCES t_usuario (id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT t_menu_usuario_indice_fk FOREIGN KEY (indice) REFERENCES t_menu (indice) ON UPDATE CASCADE
);
