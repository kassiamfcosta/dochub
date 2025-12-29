process.env.NODE_ENV = 'development';
process.env.DATABASE_URL ??= 'mysql://user:pass@localhost:3306/zello_test';
process.env.JWT_SECRET ??= 'test_jwt_secret_with_minimum_30_characters';
process.env.ZELLO_API_KEY ??= 'test_zello_api_key';
