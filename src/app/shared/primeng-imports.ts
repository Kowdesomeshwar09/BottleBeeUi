import { AvatarModule } from 'primeng/avatar';
import { BadgeModule } from 'primeng/badge';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { CheckboxModule } from 'primeng/checkbox';
import { ChipModule } from 'primeng/chip';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DataViewModule } from 'primeng/dataview';
import { DatePickerModule } from 'primeng/datepicker';
import { DialogModule } from 'primeng/dialog';
import { DividerModule } from 'primeng/divider';
import { DrawerModule } from 'primeng/drawer';
import { FileUploadModule } from 'primeng/fileupload';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { MenuModule } from 'primeng/menu';
import { MenubarModule } from 'primeng/menubar';
import { MessageModule } from 'primeng/message';
import { PaginatorModule } from 'primeng/paginator';
import { PasswordModule } from 'primeng/password';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { RadioButtonModule } from 'primeng/radiobutton';
import { RatingModule } from 'primeng/rating';
import { SelectModule } from 'primeng/select';
import { SelectButtonModule } from 'primeng/selectbutton';
import { SkeletonModule } from 'primeng/skeleton';
import { SliderModule } from 'primeng/slider';
import { StepsModule } from 'primeng/steps';
import { TableModule } from 'primeng/table';
import { TabsModule } from 'primeng/tabs';
import { TagModule } from 'primeng/tag';
import { TextareaModule } from 'primeng/textarea';
import { TimelineModule } from 'primeng/timeline';
import { ToastModule } from 'primeng/toast';
import { ToolbarModule } from 'primeng/toolbar';
import { TooltipModule } from 'primeng/tooltip';

/**
 * One import list for the PrimeNG pieces the app actually uses.
 *
 * Standalone components each declare their own imports, and repeating a dozen
 * module names in every component header is noise that drifts. Spreading this
 * array keeps the list in one place; anything genuinely one-off should still be
 * imported directly by the component that needs it rather than added here.
 */
export const PRIMENG_IMPORTS = [
  AvatarModule,
  BadgeModule,
  ButtonModule,
  CardModule,
  CheckboxModule,
  ChipModule,
  ConfirmDialogModule,
  DataViewModule,
  DatePickerModule,
  DialogModule,
  DividerModule,
  DrawerModule,
  FileUploadModule,
  IconFieldModule,
  InputIconModule,
  InputNumberModule,
  InputTextModule,
  MenuModule,
  MenubarModule,
  MessageModule,
  PaginatorModule,
  PasswordModule,
  ProgressSpinnerModule,
  RadioButtonModule,
  RatingModule,
  SelectModule,
  SelectButtonModule,
  SkeletonModule,
  SliderModule,
  StepsModule,
  TableModule,
  TabsModule,
  TagModule,
  TextareaModule,
  TimelineModule,
  ToastModule,
  ToolbarModule,
  TooltipModule,
] as const;
