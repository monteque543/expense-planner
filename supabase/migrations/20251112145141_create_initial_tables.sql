/*
  # Initial Schema Setup

  1. New Tables
    - `users` - User authentication
      - `id` (serial, primary key)
      - `username` (text, unique, not null)
      - `password` (text, not null)
    
    - `categories` - Transaction categories
      - `id` (serial, primary key)
      - `name` (text, not null)
      - `color` (text, not null)
      - `is_expense` (boolean, default true)
      - `emoji` (text, nullable)
    
    - `transactions` - Income and expense transactions
      - `id` (serial, primary key)
      - `title` (text, not null)
      - `amount` (double precision, not null)
      - `date` (timestamp, not null)
      - `notes` (text, nullable)
      - `is_expense` (boolean, not null)
      - `category_id` (integer, foreign key)
      - `person_label` (text, nullable)
      - `is_recurring` (boolean, default false)
      - `recurring_interval` (text, nullable)
      - `recurring_end_date` (timestamp, nullable)
      - `is_paid` (boolean, default false)
    
    - `savings` - Manual savings contributions
      - `id` (serial, primary key)
      - `amount` (double precision, not null)
      - `date` (timestamp, not null)
      - `notes` (text, nullable)
      - `person_label` (text, nullable)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated access
*/

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL
);

-- Create categories table
CREATE TABLE IF NOT EXISTS categories (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  color TEXT NOT NULL,
  is_expense BOOLEAN NOT NULL DEFAULT true,
  emoji TEXT
);

-- Create transactions table
CREATE TABLE IF NOT EXISTS transactions (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  amount DOUBLE PRECISION NOT NULL,
  date TIMESTAMP NOT NULL,
  notes TEXT,
  is_expense BOOLEAN NOT NULL,
  category_id INTEGER REFERENCES categories(id),
  person_label TEXT,
  is_recurring BOOLEAN DEFAULT false,
  recurring_interval TEXT,
  recurring_end_date TIMESTAMP,
  is_paid BOOLEAN DEFAULT false
);

-- Create savings table
CREATE TABLE IF NOT EXISTS savings (
  id SERIAL PRIMARY KEY,
  amount DOUBLE PRECISION NOT NULL,
  date TIMESTAMP NOT NULL,
  notes TEXT,
  person_label TEXT
);

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE savings ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (adjust based on your auth requirements)
CREATE POLICY "Allow all access to users" ON users FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to categories" ON categories FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to transactions" ON transactions FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to savings" ON savings FOR ALL TO authenticated USING (true) WITH CHECK (true);
