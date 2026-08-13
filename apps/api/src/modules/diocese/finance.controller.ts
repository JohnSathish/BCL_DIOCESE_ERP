import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ParishOpsService } from './parish-ops.service';
import {
  CreateAccountDto,
  CreateBudgetDto,
  CreateTransactionDto,
} from './dto/parish-ops.dto';
import { JwtAuthGuard, PermissionsGuard, RequirePermissions } from '../../common/guards';
import { CurrentUser, AuthPayload } from '../../common/current-user.decorator';

@ApiTags('finance')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('finance')
export class FinanceController {
  constructor(private readonly ops: ParishOpsService) {}

  @RequirePermissions('finance.read')
  @Get('summary')
  summary(@CurrentUser() user: AuthPayload, @Query('parishId') parishId?: string) {
    return this.ops.financeSummary(user, parishId);
  }

  @RequirePermissions('finance.read')
  @Get('accounts')
  accounts(@CurrentUser() user: AuthPayload, @Query('parishId') parishId?: string) {
    return this.ops.listAccounts(user, parishId);
  }

  @RequirePermissions('finance.write')
  @Post('accounts')
  createAccount(@CurrentUser() user: AuthPayload, @Body() dto: CreateAccountDto) {
    return this.ops.createAccount(user, dto);
  }

  @RequirePermissions('finance.read')
  @Get('transactions')
  transactions(@CurrentUser() user: AuthPayload, @Query('parishId') parishId?: string) {
    return this.ops.listTransactions(user, parishId);
  }

  @RequirePermissions('finance.write')
  @Post('transactions')
  createTxn(@CurrentUser() user: AuthPayload, @Body() dto: CreateTransactionDto) {
    return this.ops.createTransaction(user, dto);
  }

  @RequirePermissions('finance.read')
  @Get('budgets')
  budgets(@CurrentUser() user: AuthPayload, @Query('parishId') parishId?: string) {
    return this.ops.listBudgets(user, parishId);
  }

  @RequirePermissions('finance.write')
  @Post('budgets')
  createBudget(@CurrentUser() user: AuthPayload, @Body() dto: CreateBudgetDto) {
    return this.ops.createBudget(user, dto);
  }
}
