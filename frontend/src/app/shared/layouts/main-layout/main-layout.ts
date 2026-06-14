import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';

import { CommonModule } from '@angular/common';

import { Component, DestroyRef, ViewChild, computed, inject, signal } from '@angular/core';

import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { MatButtonModule } from '@angular/material/button';

import { MatDividerModule } from '@angular/material/divider';

import { MatIconModule } from '@angular/material/icon';

import { MatListModule } from '@angular/material/list';

import { MatMenuModule } from '@angular/material/menu';

import { MatSidenav, MatSidenavModule } from '@angular/material/sidenav';

import { MatToolbarModule } from '@angular/material/toolbar';

import { MatTooltipModule } from '@angular/material/tooltip';


import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { Observable, map, shareReplay } from 'rxjs';



import { environment } from '../../../../environments/environment';

import { AuthService } from '../../../core/auth/auth.service';

import { Rol } from '../../../core/models/usuario.model';

import { NavIcon } from '../../components/nav-icon/nav-icon';
import { EstudiantePanelWaves } from '../../components/illustrations/estudiante-panel-waves/estudiante-panel-waves';
import { SidebarZen } from '../../components/illustrations/sidebar-zen/sidebar-zen';



interface NavItem {

  label: string;

  route: string;

  icon: string;

  roles?: Rol[];

  group: 'principal' | 'gestion' | 'practica' | 'analitica';

}



interface NavGroup {

  titulo: string;

  items: NavItem[];

}



@Component({

  selector: 'app-main-layout',

  imports: [

    CommonModule,

    RouterOutlet,

    RouterLink,

    RouterLinkActive,

    MatToolbarModule,

    MatButtonModule,

    MatIconModule,

    MatListModule,

    MatSidenavModule,

    MatMenuModule,

    MatDividerModule,

    MatTooltipModule,

    NavIcon,
    EstudiantePanelWaves,
    SidebarZen,

  ],

  templateUrl: './main-layout.html',

  styleUrl: './main-layout.scss',

})

export class MainLayout {

  private readonly breakpointObserver = inject(BreakpointObserver);

  private readonly auth = inject(AuthService);

  private readonly destroyRef = inject(DestroyRef);

  @ViewChild(MatSidenav) sidenav?: MatSidenav;

  readonly appName = environment.appName;
  readonly usuario = this.auth.usuario;
  readonly rol = this.auth.rol;
  readonly sidebarOpen = signal(true);

  readonly isHandset$: Observable<boolean> = this.breakpointObserver
    .observe([Breakpoints.Handset, Breakpoints.TabletPortrait])
    .pipe(
      map((result) => result.matches),
      shareReplay({ bufferSize: 1, refCount: true }),
    );

  constructor() {
    if (this.auth.hasRol(Rol.Docente, Rol.Admin)) {
      this.auth.cargarPerfil().subscribe();
    }

    this.isHandset$

      .pipe(takeUntilDestroyed(this.destroyRef))

      .subscribe((handset) => {

        if (handset) {

          this.sidebarOpen.set(false);

        } else {

          this.sidebarOpen.set(true);

        }

      });

  }



  private readonly allNavItems: NavItem[] = [

    { label: 'Panel institucional', route: '/admin', icon: 'dashboard', roles: [Rol.Admin], group: 'principal' },

    { label: 'Panel docente', route: '/docente', icon: 'dashboard', roles: [Rol.Docente], group: 'principal' },

    { label: 'Inicio', route: '/panel-estudiante', icon: 'home', roles: [Rol.Estudiante], group: 'principal' },



    { label: 'Docentes', route: '/admin/docentes', icon: 'teachers', roles: [Rol.Admin], group: 'gestion' },

    { label: 'Casos de estudio', route: '/casos', icon: 'cases', roles: [Rol.Docente, Rol.Admin], group: 'gestion' },

    { label: 'IA generativa', route: '/ia-generativa', icon: 'ia', roles: [Rol.Docente], group: 'gestion' },

    { label: 'Importar documentos', route: '/importacion-documentos', icon: 'import', roles: [Rol.Docente], group: 'gestion' },

    { label: 'Materias', route: '/materias', icon: 'subjects', roles: [Rol.Docente], group: 'gestion' },

    { label: 'Estudiantes', route: '/estudiantes', icon: 'students', roles: [Rol.Docente, Rol.Admin], group: 'gestion' },

    { label: 'Grupos', route: '/grupos', icon: 'groups', roles: [Rol.Docente, Rol.Admin], group: 'gestion' },



    { label: 'Mis prácticas', route: '/panel-estudiante/practicas', icon: 'calendar', roles: [Rol.Estudiante], group: 'practica' },

    { label: 'Resultados y retroalimentación', route: '/panel-estudiante/resultados', icon: 'results', roles: [Rol.Estudiante], group: 'practica' },

    { label: 'Prácticas', route: '/practicas', icon: 'calendar', roles: [Rol.Docente, Rol.Admin], group: 'practica' },

    { label: 'Participaciones', route: '/participaciones', icon: 'play', roles: [Rol.Docente, Rol.Admin], group: 'practica' },

    { label: 'Solicitudes de reapertura', route: '/solicitudes-reapertura', icon: 'calendar', roles: [Rol.Docente, Rol.Admin], group: 'practica' },

    { label: 'Reinicio de prácticas', route: '/reinicio-practicas', icon: 'calendar', roles: [Rol.Docente], group: 'practica' },




    { label: 'Resultados', route: '/resultados', icon: 'results', roles: [Rol.Docente, Rol.Estudiante, Rol.Admin], group: 'analitica' },

    { label: 'Reportes', route: '/reportes', icon: 'reports', roles: [Rol.Docente, Rol.Admin], group: 'analitica' },

    { label: 'Actividad del sistema', route: '/admin/actividad', icon: 'activity', roles: [Rol.Admin], group: 'analitica' },

  ];



  readonly navGroups = computed<NavGroup[]>(() => {

    const actual = this.rol();

    if (!actual) return [];



    const filtered = this.allNavItems.filter((it) => !it.roles || it.roles.includes(actual));

    const groupOrder: NavItem['group'][] = ['principal', 'gestion', 'practica', 'analitica'];

    const labels: Record<NavItem['group'], string> = {

      principal: 'Principal',

      gestion: 'Gestión',

      practica: 'Práctica',

      analitica: 'Analítica',

    };



    return groupOrder

      .map((g) => ({

        titulo: labels[g],

        items: filtered.filter((it) => it.group === g),

      }))

      .filter((g) => g.items.length > 0);

  });



  readonly iniciales = computed(() => {

    const u = this.usuario();

    if (!u) return '?';

    const first = (u.first_name || '').charAt(0);

    const last = (u.last_name || '').charAt(0);

    const combo = (first + last).toUpperCase();

    return combo || (u.username || '?').charAt(0).toUpperCase();

  });



  readonly rolLabel = computed(() => {

    const u = this.usuario();

    if (!u) return '';

    if (u.rol === 'ADMIN') return 'Administrador';

    if (u.rol === 'DOCENTE') return 'Docente';

    if (u.rol === 'ESTUDIANTE') return 'Estudiante';

    return u.rol;

  });



  readonly showDocenteActions = computed(() => this.rol() === Rol.Docente);

  readonly isEstudiante = computed(() => this.rol() === Rol.Estudiante);



  onSidebarOpenedChange(open: boolean): void {

    this.sidebarOpen.set(open);

  }



  closeSidebar(): void {

    this.sidenav?.close();

  }



  openSidebar(): void {

    this.sidenav?.open();

  }



  toggleSidebar(): void {

    this.sidenav?.toggle();

  }



  closeIfOverMode(): void {

    if (this.sidenav?.mode === 'over') {

      this.sidenav.close();

    }

  }



  logout(): void {

    this.auth.logout().subscribe();

  }

}

