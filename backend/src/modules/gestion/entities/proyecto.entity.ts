import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Relation,
} from 'typeorm';

import { Tarea } from './tarea.entity';
import { Cliente } from './cliente.entity';
import { EstadosProyectosEnum } from '../enums/estados-proyectos.enum';

@Entity('proyectos')
export class Proyecto {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 255 })
  nombre: string;

  @Column({ type: 'text', nullable: true })
  descripcion: string;

  @Column({
    type: 'varchar',
    length: 50,
    default: EstadosProyectosEnum.ACTIVO,
  })
  estado: EstadosProyectosEnum;

  @ManyToOne(() => Cliente, (cliente) => cliente.proyectos, {
    nullable: true,
  })
  @JoinColumn({ name: 'id_cliente' })
  cliente: Relation<Cliente> | null;

  @OneToMany(() => Tarea, (tarea) => tarea.proyecto, {
    cascade: true,
  })
  tareas: Relation<Tarea[]>;

  @CreateDateColumn({ name: 'fecha_creacion' })
  fechaCreacion: Date;

  @UpdateDateColumn({ name: 'fecha_actualizacion' })
  fechaActualizacion: Date;
}
