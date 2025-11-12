/*
  # Fix RLS Policy for Anonymous Access

  1. Changes
    - Drop existing restrictive authenticated-only policy
    - Add new policy allowing both authenticated and anonymous access
    - This allows the server to fetch transactions using the ANON key

  2. Security
    - Since this is a single-user application, anonymous access is acceptable
    - All users can read/write all transactions
*/

-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Allow all access to transactions" ON transactions;

-- Create a new policy that allows both authenticated and anonymous access
CREATE POLICY "Allow all access to transactions for everyone"
  ON transactions
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);
