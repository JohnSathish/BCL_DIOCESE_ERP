import { Injectable } from '@nestjs/common';

import { ConfigService } from '@nestjs/config';

import { randomUUID } from 'crypto';

import { PrismaService } from '../../prisma/prisma.service';

import { buildStorageAdapter, type StorageInfo } from './storage.adapter';



@Injectable()

export class FilesService {

  private readonly storageInfo: StorageInfo;



  constructor(

    private readonly prisma: PrismaService,

    config: ConfigService,

  ) {

    const built = buildStorageAdapter(config);

    this.adapter = built.adapter;

    this.storageInfo = built.info;

  }



  private adapter: import('./storage.adapter').StorageAdapter;



  storageStatus(): StorageInfo {

    return this.storageInfo;

  }



  async upload(

    organizationId: string,

    file: { buffer: Buffer; originalname: string; mimetype: string; size: number },

  ) {

    const key = `${organizationId}/${randomUUID()}-${file.originalname}`;

    const url = await this.adapter.put(key, file.buffer, file.mimetype);

    return this.prisma.mediaAsset.create({

      data: {

        organizationId,

        key,

        url,

        mimeType: file.mimetype,

        sizeBytes: file.size,

      },

    });

  }

}


