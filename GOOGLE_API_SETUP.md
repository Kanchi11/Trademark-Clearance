# Google API Setup Guide (Optional)

Enabling Google Custom Search API will provide automated common law trademark searches. This is **optional** - the tool works without it by providing manual search links instead.

---

## Benefits of Enabling Google API

✅ **Automated** web searches for common law usage
✅ **10 results** per search instead of manual checking
✅ **Faster** workflow - results appear instantly
✅ **Professional** reports with actual web evidence

**Without API**: You'll get manual search links for Google, LinkedIn, and Crunchbase (still functional!)

---

## Setup Instructions

### 1. Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click "Select a project" → "New Project"
3. Name it "Trademark Clearance Tool"
4. Click "Create"

### 2. Enable Custom Search API

1. In the Google Cloud Console, go to **APIs & Services** → **Library**
2. Search for "Custom Search API"
3. Click on it and click **"Enable"**

### 3. Create API Credentials

1. Go to **APIs & Services** → **Credentials**
2. Click **"Create Credentials"** → **"API Key"**
3. **Copy the API key** - you'll need this in step 5
4. (Optional but recommended) Click "Restrict Key":
   - **API restrictions**: Select "Custom Search API"
   - **Application restrictions**: Select "HTTP referrers" and add:
     - `localhost:*`
     - Your production domain (when deployed)

### 4. Create a Custom Search Engine

1. Go to [Google Programmable Search Engine](https://programmablesearchengine.google.com/controlpanel/create)
2. Fill in:
   - **Name**: "Trademark Common Law Search"
   - **What to search**: "Search the entire web"
   - **Search settings**: Enable "Search the entire web"
3. Click **"Create"**
4. On the next page, click **"Customize"**
5. **Copy your Search Engine ID** (looks like: `017576662512468239146:omuauf_lfve`)

### 5. Add to Environment Variables

Open `.env.local` in your project root and add:

```bash
# Google Custom Search API (Optional - enables automated common law searches)
GOOGLE_API_KEY=your_api_key_here
GOOGLE_SEARCH_ENGINE_ID=your_search_engine_id_here
```

**Example**:
```bash
GOOGLE_API_KEY=AIzaSyDq5j8K9vXxYZwZ1B_example_key_here
GOOGLE_SEARCH_ENGINE_ID=017576662512468239146:omuauf_lfve
```

### 6. Restart Your Dev Server

```bash
# Stop current server (Ctrl+C)
npm run dev
```

---

## Pricing & Quotas

### Free Tier (Default)
- **100 searches/day** - FREE
- **10,000 searches/month** - FREE
- Perfect for V1/testing

### Paid Tier (If needed later)
- **$5 per 1,000 searches** beyond free quota
- Most small businesses stay within free tier

**Cost comparison**:
- Professional trademark search: **$500-$5,000**
- Our tool with Google API: **FREE** (or $5/month for heavy usage)

---

## Testing

After setup, search for "Nike" and you should see:

**Before** (without API):
```
Common Law & Web Usage
└─ Manual Search Links
   ├─ Google: "Nike" trademark
   ├─ LinkedIn: Nike company
   └─ Crunchbase: Nike
```

**After** (with API):
```
Common Law & Web Usage
├─ Web Search Results (10 found)
│  ├─ Nike, Inc. - Official Website
│  ├─ Nike - Wikipedia
│  └─ ... 8 more results
├─ Summary: Found 10 potential common law uses
└─ Manual Search Links
   └─ ... (still available as backup)
```

---

## Troubleshooting

### "API key not configured" message
✅ Check `.env.local` file exists in project root
✅ Verify variable names match exactly (`GOOGLE_API_KEY`)
✅ Restart dev server after adding keys

### "403 Forbidden" error
✅ Custom Search API is enabled in Google Cloud
✅ API key restrictions allow your domain/localhost
✅ Search Engine has "Search the entire web" enabled

### "429 Too Many Requests"
✅ You've hit the 100/day free limit
✅ Wait until tomorrow OR upgrade to paid tier
✅ Tool still works with manual links!

---

## Alternative: Use Manual Links

**Don't want to set up Google API?** That's fine!

The tool automatically provides manual search links:
- Google searches (3 variations)
- LinkedIn company search
- Crunchbase search

Users can click these links to manually verify common law usage. **This is perfectly acceptable for V1!**

---

## Security Notes

⚠️ **NEVER commit `.env.local` to Git** - it's already in `.gitignore`
⚠️ **Restrict your API key** to your domain to prevent abuse
⚠️ **Monitor usage** in Google Cloud Console

---

## Summary

| Feature | Without API | With API |
|---------|-------------|----------|
| Common Law Search | ✅ Manual links | ✅ Automated + Manual |
| Cost | FREE | FREE (100/day) |
| Setup Time | 0 minutes | 10-15 minutes |
| Results Quality | User clicks links | Instant results |
| V1 Ready? | **YES** ✅ | **YES** ✅ |

**Recommendation for V1**: Ship without Google API, add it later if users request automated searches. Manual links are sufficient!
