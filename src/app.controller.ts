import { Controller, Get, Inject, OnModuleInit, Query } from '@nestjs/common';
import { AppService } from './app.service';
import { Admin, Kafka } from 'kafkajs';
import { ClientKafka } from '@nestjs/microservices';

@Controller()
export class AppController implements OnModuleInit {
  private admin: Admin;
  constructor(@Inject('LEADERBOARD_SERVICE') private client: ClientKafka) {}

  private getFiboResult(num: number) {
    return new Promise((resolve) => {
      this.client.send('fibo', JSON.stringify({ num })).subscribe((result: number) => {
        console.log('>>>>>>>>>>>>>>>>>>>>>>>>', result);
        resolve(result);
      });
    });
  }

  @Get('/microservice-fibonacci')
  async getFibonacci(@Query('num') num: number) {
    const fibo = await this.getFiboResult(Number(num));
    return fibo;
  }

  async onModuleInit() {
    console.log('Init');
    this.client.subscribeToResponseOf('fibo');
    const kafka = new Kafka({
      clientId: 'my-app',
      brokers: ['localhost:9094'],
    });
    this.admin = kafka.admin();
    const topics = await this.admin.listTopics();

    const topicList = [];
    if (!topics.includes('fibo')) {
      topicList.push({
        topic: 'fibo',
        numPartitions: 10,
        replicationFactor: 1,
      });
    }

    if (!topics.includes('fibo.reply')) {
      topicList.push({
        topic: 'fibo.reply',
        numPartitions: 10,
        replicationFactor: 1,
      });
    }

    if (topicList.length) {
      await this.admin.createTopics({
        topics: topicList,
      });
    }
  }
}
