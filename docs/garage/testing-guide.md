# Garage Feature Testing Guide

## Step 1: Insert Test Data in Supabase

1. **Log into Supabase Dashboard**
   - Make sure you're authenticated (so `auth.uid()` works)

2. **Run the Test Data Script**
   - Go to **SQL Editor**
   - Open `supabase/seeds/garage_test_data.sql`
   - Copy the entire contents
   - Paste into SQL Editor
   - Click **Run**

3. **Verify Data Inserted**
   - The script will output a SELECT query at the end showing inserted items
   - You should see 5 items:
     - 1 Saved Build
     - 1 Purchased Item
     - 1 Prototype
     - 2 Wishlist Items

## Step 2: Test in Your Website

1. **Open Your Website**
   - Make sure you're logged in
   - Navigate to `/garage` route

2. **Check Debug Panel**
   - In development mode, you'll see a debug panel at the top
   - It shows:
     - Connection status
     - Item counts by state
     - User ID
     - Any errors

3. **Check Browser Console**
   - Open DevTools (F12)
   - Look for logs prefixed with:
     - `[Garage]` - Component lifecycle
     - `[GarageStore]` - State management
     - `[API]` - API calls to Supabase

## Expected Console Output

```
[Garage] Component mounted, loading garage items...
[Garage] Session: Authenticated
[Garage] User ID: <your-user-id>
[GarageStore] Fetching garage items with filters: {state: null, model: null, search: ''}
[API] Fetching garage for user: <your-user-id>
[API] Executing query with filters: {state: null, model: null, search: ''}
[API] Query successful, returned 5 items
[GarageStore] Fetched 5 items from Supabase
[GarageStore] Total count: 5
[Garage] Loaded items: 5
[Garage] Items by state: {saved: 1, purchased: 1, prototype: 1, wishlist: 2}
[Garage] Subscribed to real-time updates
```

## What to Verify

### ✅ Visual Check
- [ ] Four lanes are visible: Saved Builds, Purchases, Prototypes, Wishlist
- [ ] Items appear in correct lanes:
  - 1 item in "Saved Builds"
  - 1 item in "Purchases"
  - 1 item in "Prototypes"
  - 2 items in "Wishlist"
- [ ] Car cards show:
  - Title
  - Vehicle model
  - Price (formatted)
  - Last updated date

### ✅ Functionality Check
- [ ] Filters work (try filtering by state)
- [ ] Search works (try searching by title)
- [ ] Delete works (click delete on an item)
- [ ] Real-time updates (open two tabs, delete in one, see it disappear in the other)

### ✅ Error Handling
- [ ] If not logged in, shows appropriate error
- [ ] If Supabase is down, shows error message
- [ ] Error messages are user-friendly

## Troubleshooting

### No Items Showing
1. **Check Authentication**
   - Console should show `[API] Fetching garage for user: <id>`
   - If you see "Not authenticated", log out and log back in

2. **Check RLS Policies**
   - In Supabase Dashboard → Table Editor → garage_items → Policies
   - Verify `garage_items_owner_access` policy exists
   - Test query: `SELECT * FROM garage_items WHERE owner_id = auth.uid();`

3. **Check Test Data**
   - Run: `SELECT COUNT(*) FROM garage_items WHERE owner_id = auth.uid();`
   - Should return 5

### Items Show But Wrong Lanes
- Check the `state` column in database
- Values should be: `saved`, `purchased`, `prototype`, `wishlist`
- Run: `SELECT id, title, state FROM garage_items WHERE owner_id = auth.uid();`

### Console Errors
- **"relation garage_items does not exist"**
  - Run the schema migration script again
  
- **"permission denied"**
  - Check RLS policies are enabled
  - Verify you're authenticated

- **"Not authenticated"**
  - Log out and log back in
  - Check Supabase session is valid

## Clean Up Test Data

To remove test data:

```sql
DELETE FROM garage_versions WHERE garage_item_id IN (
  SELECT id FROM garage_items WHERE owner_id = auth.uid()
);
DELETE FROM garage_items WHERE owner_id = auth.uid();
```

## Next Steps

Once testing is successful:
1. Remove debug logging (or keep for development)
2. Test with real configurator integration
3. Test pagination with >20 items
4. Test offline functionality

