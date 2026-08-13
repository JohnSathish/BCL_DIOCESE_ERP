import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

export interface StorageAdapter {
  put(key: string, buffer: Buffer, mimeType?: string): Promise<string>;
}

export class LocalStorageAdapter implements StorageAdapter {
  constructor(private readonly basePath: string) {}

  async put(key: string, buffer: Buffer): Promise<string> {
    const full = join(this.basePath, key);
    await mkdir(join(full, '..'), { recursive: true });
    await writeFile(full, buffer);
    return `/uploads/${key.replace(/\\/g, '/')}`;
  }
}

export class S3StorageAdapter implements StorageAdapter {
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly publicBase: string;

  constructor(opts: {
    bucket: string;
    region: string;
    endpoint?: string;
    publicUrl?: string;
    accessKeyId: string;
    secretAccessKey: string;
  }) {
    this.bucket = opts.bucket;
    this.client = new S3Client({
      region: opts.region,
      endpoint: opts.endpoint,
      forcePathStyle: Boolean(opts.endpoint),
      credentials: {
        accessKeyId: opts.accessKeyId,
        secretAccessKey: opts.secretAccessKey,
      },
    });
    if (opts.publicUrl) {
      this.publicBase = opts.publicUrl.replace(/\/$/, '');
    } else if (opts.endpoint) {
      this.publicBase = `${opts.endpoint.replace(/\/$/, '')}/${opts.bucket}`;
    } else {
      this.publicBase = `https://${opts.bucket}.s3.${opts.region}.amazonaws.com`;
    }
  }

  async put(key: string, buffer: Buffer, mimeType?: string): Promise<string> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: mimeType || 'application/octet-stream',
      }),
    );
    return `${this.publicBase}/${key.replace(/\\/g, '/')}`;
  }
}

export type StorageDriver = 'local' | 's3' | 'r2';

export type StorageInfo = {
  driver: StorageDriver;
  active: 'local' | 's3' | 'r2';
  configured: boolean;
  publicBase?: string | null;
  note?: string;
};

export function buildStorageAdapter(config: {
  get: (key: string) => string | undefined;
}): { adapter: StorageAdapter; info: StorageInfo } {
  const driver = (config.get('STORAGE_DRIVER') || 'local').toLowerCase() as StorageDriver;
  const localPath = config.get('STORAGE_LOCAL_PATH') || './uploads';

  if (driver === 's3') {
    const bucket = config.get('AWS_S3_BUCKET');
    const region = config.get('AWS_S3_REGION') || 'us-east-1';
    const accessKeyId = config.get('AWS_ACCESS_KEY_ID');
    const secretAccessKey = config.get('AWS_SECRET_ACCESS_KEY');
    const publicUrl = config.get('AWS_S3_PUBLIC_URL');

    if (bucket && accessKeyId && secretAccessKey) {
      const adapter = new S3StorageAdapter({
        bucket,
        region,
        publicUrl,
        accessKeyId,
        secretAccessKey,
      });
      return {
        adapter,
        info: {
          driver: 's3',
          active: 's3',
          configured: true,
          publicBase: publicUrl || `s3://${bucket}`,
        },
      };
    }

    return {
      adapter: new LocalStorageAdapter(localPath),
      info: {
        driver: 's3',
        active: 'local',
        configured: false,
        note: 'Set AWS_S3_BUCKET, AWS_ACCESS_KEY_ID, and AWS_SECRET_ACCESS_KEY',
      },
    };
  }

  if (driver === 'r2') {
    const bucket = config.get('R2_BUCKET');
    const accountId = config.get('R2_ACCOUNT_ID');
    const accessKeyId = config.get('R2_ACCESS_KEY_ID');
    const secretAccessKey = config.get('R2_SECRET_ACCESS_KEY');
    const publicUrl = config.get('R2_PUBLIC_URL');

    if (bucket && accountId && accessKeyId && secretAccessKey) {
      const adapter = new S3StorageAdapter({
        bucket,
        region: 'auto',
        endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
        publicUrl,
        accessKeyId,
        secretAccessKey,
      });
      return {
        adapter,
        info: {
          driver: 'r2',
          active: 'r2',
          configured: true,
          publicBase: publicUrl || `r2://${bucket}`,
        },
      };
    }

    return {
      adapter: new LocalStorageAdapter(localPath),
      info: {
        driver: 'r2',
        active: 'local',
        configured: false,
        note: 'Set R2_BUCKET, R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, and R2_SECRET_ACCESS_KEY',
      },
    };
  }

  return {
    adapter: new LocalStorageAdapter(localPath),
    info: {
      driver: 'local',
      active: 'local',
      configured: true,
      publicBase: '/uploads',
    },
  };
}
