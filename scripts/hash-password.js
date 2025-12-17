import bcrypt from 'bcryptjs';

const password = process.argv[2];

if (!password) {
    console.error('Usage: node scripts/hash-password.js <password>');
    process.exit(1);
}

const saltRounds = 10;

bcrypt.hash(password, saltRounds, (err, hash) => {
    if (err) {
        console.error('Error hashing password:', err);
        process.exit(1);
    }
    console.log('Password Hash:');
    console.log(hash);
});
