import { prisma } from '../src/lib/prisma';
import { Prisma } from '../src/generated/prisma/client';
import bcrypt from 'bcrypt';
import {faker} from '@faker-js/faker';

const userData: Prisma.UserCreateInput[] = [
  {
    phone: '1234567890',
    password: '',
    email: 'user0@example.com',
    randomToken: '4395ojoijjiehwfiwi1',
  },
  {
    phone: '1234567891',
    password: '',
    email: 'user1@example.com',
    randomToken: '4395ojoijjiehwfiwi2',
  },
  {
    phone: '1234567892',
    password: '',
    email: 'user2@example.com',
    randomToken: '4395ojoijjiehwfiwi3',
  },
  {
    phone: '1234567893',
    password: '',
    email: 'user3@example.com',
    randomToken: '4395ojoijjiehwfiwi4',
  },
];

function createRoomUser(){
  return {
    phone: faker.phone.number({style:'international'}),
    password: '',
    email: faker.internet.email(),
    randomToken: faker.internet.jwt(),
  }
}
export const users = Array.from({length: 10}, () => createRoomUser());

async function main (){
    const salt = await bcrypt.genSalt(10);
            const password = await bcrypt.hash('12345678', salt);

    for (const user of users){
         user.password = password;
         await prisma.user.create({ data: user });
    }
}


main().then( async()=>{
    await prisma.$disconnect();
}).catch(async(e)=>{
    
    console.error( e ,  "seeding data");
    await prisma.$disconnect();
    process.exit(1);
})