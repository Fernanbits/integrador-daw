import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Relation,
} from 'typeorm';

import { Proyecto } from './proyecto.entity';
import { EstadosTareasEnum } from '../enums/estados-tareas.enum';
import { PrioridadesTareasEnum } from '../enums/prioridades-tareas.enum';

@Entity('tareas')
export class Tarea {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'text' })
  descripcion: string;

  @Column({
    type: 'enum',
    enum: EstadosTareasEnum,
    default: EstadosTareasEnum.PENDIENTE,
  })
  estado: EstadosTareasEnum;

  @Column({
    type: 'enum',
    enum: PrioridadesTareasEnum,
    default: PrioridadesTareasEnum.MEDIA,
  })
  prioridad: PrioridadesTareasEnum;

  @Column({ type: 'date', name: 'fecha_vencimiento', nullable: true })
  fechaVencimiento: Date | null;

  @ManyToOne(() => Proyecto, (proyecto) => proyecto.tareas, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'proyecto_id' })
  proyecto: Relation<Proyecto>;

  @CreateDateColumn({ name: 'fecha_creacion' })
  fechaCreacion: Date;

  @UpdateDateColumn({ name: 'fecha_actualizacion' })
  fechaActualizacion: Date;
}
