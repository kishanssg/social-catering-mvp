# Google Places API Setup

## Overview
The Social Catering MVP uses Google Places Autocomplete API with a hybrid caching strategy:
- **Autocomplete**: Real-time search from Google (debounced, session tokens)
- **Place Details**: Fetched once and cached in database
- **Reuse**: Cached venues loaded first, with edit/save for instructions

## Cost Optimization
- **Session tokens**: Groups autocomplete + details into single billing
- **Debouncing**: 300ms delay reduces API calls
- **Caching**: Venues stored in DB, only re-fetch if stale (30+ days)
- **Estimated cost**: ~$5-10/month for 100-150 searches

## Setup Instructions

### 1. Get Google Places API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable **Places API (New)**
4. Go to **APIs & Services** > **Credentials**
5. Click **Create Credentials** > **API Key**
6. Restrict the key:
   - **Application restrictions**: HTTP referrers (for production) or None (for dev)
   - **API restrictions**: Restrict to "Places API (New)"
7. Copy the API key

### 2. Add to Rails Credentials (Production)

**For production (Heroku):**

```bash
# Edit credentials
EDITOR="nano" rails credentials:edit

# Add this section:
google_places:
  api_key: YOUR_ACTUAL_API_KEY_HERE

# Save and exit (Ctrl+X, Y, Enter in nano)
```

**Important**: Make sure `config/master.key` is in `.gitignore` and never committed.

### 3. Add to Environment Variables (Development)

**For local development:**

```bash
# Add to .env or export directly
export GOOGLE_PLACES_API_KEY="YOUR_ACTUAL_API_KEY_HERE"
```

Or add to `.env` file (create if it doesn't exist):

```env
GOOGLE_PLACES_API_KEY=YOUR_ACTUAL_API_KEY_HERE
```

**Note**: Make sure `.env` is in `.gitignore`.

### 4. Heroku Configuration

```bash
# Set environment variable on Heroku
heroku config:set GOOGLE_PLACES_API_KEY="YOUR_ACTUAL_API_KEY_HERE" -a your-app-name

# Verify
heroku config:get GOOGLE_PLACES_API_KEY -a your-app-name
```

### 5. Verify Setup

Start Rails console and test:

```ruby
rails console

# Test the service
service = GooglePlacesService.new
result = service.autocomplete("Capital City Country Club")
puts result.inspect

# Should return results without errors
```

## API Endpoints

### Frontend Routes
- `GET /api/v1/venues/search?query=...&session_token=...`
  - Returns cached venues + Google autocomplete results
- `POST /api/v1/venues/select`
  - Selects venue (fetches from cache or Google)
- `PATCH /api/v1/venues/:id`
  - Updates arrival instructions and parking info

### Usage in CreateJobWizard
- Step 1 (Location): `VenueAutocomplete` component
- Debounced search (300ms)
- Session tokens for cost optimization
- Cached venues shown first
- Edit/save instructions always available

## Database Schema

```ruby
create_table :venues do |t|
  t.string :place_id, null: false          # Google Place ID
  t.string :name, null: false              # Venue name
  t.text :formatted_address, null: false   # Full address
  t.decimal :latitude, precision: 10, scale: 6
  t.decimal :longitude, precision: 10, scale: 6
  t.text :arrival_instructions             # Custom instructions
  t.text :parking_info                     # Custom parking info
  t.string :phone
  t.string :website
  t.timestamptz :last_synced_at_utc        # For staleness check
  t.timestamptz :created_at_utc, null: false
  t.timestamptz :updated_at_utc, null: false
end

add_index :venues, :place_id, unique: true
add_index :venues, :name
add_index :venues, :last_synced_at_utc
```

## Hybrid Caching Strategy

1. **User types in search**:
   - Frontend debounces input (300ms)
   - Sends request with session token
   - Backend searches local DB + calls Google Autocomplete
   - Returns both cached and Google results

2. **User selects venue**:
   - If in cache: return immediately
   - If not in cache: fetch Place Details from Google, store in DB
   - Session token ensures autocomplete + details = 1 billing unit

3. **Subsequent uses**:
   - Load from DB (no API call)
   - Show edit/save buttons for instructions
   - Only re-fetch if stale (30+ days old)

## Cost Breakdown (Estimated)

**Google Places API (New) Pricing:**
- Autocomplete (per session): $2.83 per 1,000 sessions
- Place Details (per session): $17.00 per 1,000 sessions
- **Combined with session token**: $17.00 per 1,000 (billed as Place Details only)

**For 100-150 searches/month:**
- Cost: ~$2.55 - $3.83/month
- With some cache hits: ~$1.50 - $2.50/month

**Scaling to 1,000 searches/month:**
- Cost: ~$17/month
- With 50% cache hit rate: ~$8.50/month

## Troubleshooting

### "Google Places API key not configured"
- Check environment variable is set: `echo $GOOGLE_PLACES_API_KEY`
- Verify credentials: `rails credentials:show`
- Restart Rails server after adding key

### "ZERO_RESULTS" or no results
- Verify API key is valid
- Check API is enabled in Google Cloud Console
- Ensure no billing issues

### "REQUEST_DENIED"
- Check API restrictions on the key
- Verify Places API (New) is enabled
- Check billing is set up

## Security Best Practices

1. **Never commit API keys** to git
2. **Restrict API key** in Google Cloud Console
3. **Use environment variables** for all environments
4. **Monitor usage** in Google Cloud Console
5. **Set up billing alerts** to avoid surprises

## Future Enhancements

- Add venue photos from Google
- Implement geocoding for custom addresses
- Add venue ratings and reviews
- Implement venue categories/filtering
- Add map preview for selected venue

