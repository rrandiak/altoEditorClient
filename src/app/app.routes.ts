import { Routes } from '@angular/router';
import { EditingComponent } from './pages/editing/editing.component';
import { RevisionComponent } from './pages/revision/revision.component';
import { RevisionDetailComponent } from './pages/revision/revision-detail/revision-detail.component';
import { MyEditingComponent } from './pages/my-editing/my-editing.component';
import { ProcessManagementComponent } from './pages/process-management/process-management.component';
import { DocumentHierarchyComponent } from './pages/document-hierarchy/document-hierarchy.component';
import { LoginComponent } from './pages/login/login.component';
import { AuthComponent } from './pages/auth/auth.component';
import { AuthGuard } from './auth.guard';
import { CuratorGuard } from './curator.guard';
import { HomeComponent } from './pages/home/home.component';
import { MaintenanceComponent } from './pages/maintenance/maintenance.component';

export const routes: Routes = [
  { path: '', component: HomeComponent, canActivate: [AuthGuard] },
  { path: 'login', component: LoginComponent },
  { path: 'keycloak', component: AuthComponent },
  {
    path: 'my-editing',
    component: MyEditingComponent,
    canActivate: [AuthGuard],
  },
  { path: 'revision', component: RevisionComponent, canActivate: [AuthGuard, CuratorGuard] },
  {
    path: 'process-management',
    component: ProcessManagementComponent,
    canActivate: [AuthGuard, CuratorGuard],
  },
  { path: 'hierarchy', redirectTo: 'document-hierarchy', pathMatch: 'full' },
  {
    path: 'document-hierarchy',
    component: DocumentHierarchyComponent,
    canActivate: [AuthGuard, CuratorGuard],
  },
  {
    path: 'maintenance',
    component: MaintenanceComponent,
    canActivate: [AuthGuard, CuratorGuard],
  },
  { path: ':pid', redirectTo: ':pid/editing', pathMatch: 'full' },
  {
    path: ':pid/editing',
    component: EditingComponent,
    canActivate: [AuthGuard],
  },
  {
    path: 'revision/:pid/:version',
    component: RevisionDetailComponent,
    canActivate: [AuthGuard, CuratorGuard],
  },
  {
    path: 'revision/:pid',
    component: RevisionDetailComponent,
    canActivate: [AuthGuard, CuratorGuard],
  },
];
