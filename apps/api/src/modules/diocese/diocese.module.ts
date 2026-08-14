import { Module } from '@nestjs/common';
import { DioceseProfileService } from './diocese-profile.service';
import { DioceseProfileController } from './diocese-profile.controller';
import { DeaneryService } from './deanery.service';
import { DeaneryController } from './deanery.controller';
import { ParishService } from './parish.service';
import { ParishController } from './parish.controller';
import { ParishProvisioningService } from './parish-provisioning.service';
import { I18nModule } from '../i18n/i18n.module';
import { ParishInviteService } from './parish-invite.service';
import { FamilyService } from './family.service';
import { FamilyController } from './family.controller';
import { MemberService } from './member.service';
import { MemberController } from './member.controller';
import { FamilyTreeService } from './family-tree.service';
import { FamilyTreeController } from './family-tree.controller';
import { SacramentService } from './sacrament.service';
import { SacramentController } from './sacrament.controller';
import { CertificateController } from './certificate.controller';
import { RegisterController } from './register.controller';
import { ParishOpsService } from './parish-ops.service';
import { MassController } from './mass.controller';
import { DonationController } from './donation.controller';
import { FinanceController } from './finance.controller';
import { CemeteryController } from './cemetery.controller';
import { HallController } from './hall.controller';
import { CatechismController } from './catechism.controller';
import { CommunicationController, CalendarController } from './communication.controller';
import { Phase4Service } from './phase4.service';
import { AiAssistantService } from '../ai/ai-assistant.service';
import {
  AiController,
  DioceseExpansionController,
} from './phase4.controller';
import {
  ClergyPriestController,
  CongregationController,
  InstitutionController,
} from './clergy.controller';
import { ClergyService } from './clergy.service';
import { TimelineService } from './timeline.service';
import { TimelineController } from './timeline.controller';
import { AccommodationService } from './accommodation.service';
import { AccommodationController } from './accommodation.controller';
import { AccommodationPortalController } from './accommodation-portal.controller';
import { TenancyModule } from '../tenancy/tenancy.module';
import { AuditModule } from '../audit/audit.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { AppControlModule } from '../app-control/app-control.module';

@Module({
  imports: [TenancyModule, AuditModule, NotificationsModule, AppControlModule, I18nModule],
  providers: [
    DioceseProfileService,
    DeaneryService,
    ParishService,
    ParishProvisioningService,
    ParishInviteService,
    FamilyService,
    MemberService,
    FamilyTreeService,
    SacramentService,
    ParishOpsService,
    Phase4Service,
    AiAssistantService,
    ClergyService,
    TimelineService,
    AccommodationService,
  ],
  controllers: [
    DioceseProfileController,
    DeaneryController,
    ParishController,
    FamilyController,
    MemberController,
    FamilyTreeController,
    SacramentController,
    CertificateController,
    RegisterController,
    MassController,
    DonationController,
    FinanceController,
    CemeteryController,
    HallController,
    CatechismController,
    CommunicationController,
    CalendarController,
    DioceseExpansionController,
    CongregationController,
    InstitutionController,
    ClergyPriestController,
    AiController,
    TimelineController,
    AccommodationController,
    AccommodationPortalController,
  ],
  exports: [
    SacramentService,
    ParishOpsService,
    Phase4Service,
    ClergyService,
    TimelineService,
    AccommodationService,
  ],
})
export class DioceseModule {}
