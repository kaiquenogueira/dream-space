import bcrypt from 'bcryptjs';

const password = process.argv[2];

if (!password) {
  console.error('Usage: node scripts/generate-password.js <your-password>');
  process.exit(1);
}

bcrypt.hash(password, 10).then(hash => {
  console.log('\nCopy this hash and paste it into your .env file as ADMIN_PASSWORD_HASH:');
  console.log('------------------------------------------------------------------');
  console.log(hash);
  console.log('------------------------------------------------------------------\n');
});
