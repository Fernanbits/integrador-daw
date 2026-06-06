import { Column, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn, Index } from "typeorm";
import { EstadosProyectosEnum } from "../enums/estados-proyectos.enum";
import { Cliente } from "./cliente.entity";
import { Tarea } from "./tarea.entity";

@Entity({ name: "proyectos" })
@Index(["nombre"])
export class Proyecto {

    @PrimaryGeneratedColumn()
    id!: number;

    @Column()
    nombre!: string;

    @Index()
    @Column({ type: 'enum', enum: EstadosProyectosEnum })
    estado!: EstadosProyectosEnum

    @Column({ name: "id_cliente", nullable: true })
    idCliente!: number | null;

    @ManyToOne(() => Cliente, { nullable: true })
    @JoinColumn({ name: "id_cliente" })
    cliente!: Cliente | null;

    @OneToMany(() => Tarea, (tarea) => tarea.proyecto)
    tareas!: Tarea[]
}