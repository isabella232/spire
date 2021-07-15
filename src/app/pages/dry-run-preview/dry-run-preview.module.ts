import { NgModule } from '@angular/core'
import { CommonModule } from '@angular/common'
import { FormsModule } from '@angular/forms'

import { IonicModule } from '@ionic/angular'

import { DryRunPreviewPageRoutingModule } from './dry-run-preview-routing.module'

import { DryRunPreviewPage } from './dry-run-preview.page'
import { NgxJsonViewerModule } from 'ngx-json-viewer'
import { DirectivesModule } from 'src/app/directives/directives.module'

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    DryRunPreviewPageRoutingModule,
    NgxJsonViewerModule,
    DirectivesModule
  ],
  declarations: [DryRunPreviewPage]
})
export class DryRunPreviewPageModule {}
