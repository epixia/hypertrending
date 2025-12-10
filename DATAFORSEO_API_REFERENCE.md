# DataForSEO API v3 Reference Documentation

## Table of Contents

- [Overview](#overview)
- [Authentication](#authentication)
- [API Categories](#api-categories)
  - [SERP API](#serp-api)
  - [Keywords Data API](#keywords-data-api)
  - [Backlinks API](#backlinks-api)
  - [DataForSEO Labs API](#dataforseo-labs-api)
  - [OnPage API](#onpage-api)
  - [Domain Analytics API](#domain-analytics-api)
  - [Merchant API](#merchant-api)
  - [Content Analysis API](#content-analysis-api)
  - [Business Data API](#business-data-api)
  - [App Data API](#app-data-api)
- [Rate Limits](#rate-limits)
- [Data Retrieval Methods](#data-retrieval-methods)
- [Error Codes](#error-codes)
- [Response Storage](#response-storage)

---

## Overview

DataForSEO provides a comprehensive REST-based API platform built on HTTP protocol. The API supports multiple programming languages through official client libraries for **PHP**, **C#**, **Java**, **Python**, and **TypeScript**.

**Base URL:** `https://api.dataforseo.com/v3/`

**Data Format:**
- UTF-8 encoding with gzip compression (default)
- JSON-formatted responses (XML and HTML alternatives available via URL suffixes)

---

## Authentication

DataForSEO uses **Basic Authentication** for all API requests.

### Getting Credentials

1. Create an account at [DataForSEO](https://app.dataforseo.com/register)
2. Retrieve credentials from your [dashboard](https://app.dataforseo.com/api-access)
3. Note: The API password is auto-generated and differs from your account password

### Authentication Header

All requests require the `Authorization` header with Base64-encoded credentials:

```
Authorization: Basic [base64-encoded login:password]
```

**Example:** For login `login` and password `password`:
- Base64 encoding produces: `bG9naW46cGFzc3dvcmQ=`
- Header: `Authorization: Basic bG9naW46cGFzc3dvcmQ=`

### Code Examples

**Python:**
```python
from client import RestClient
client = RestClient("login", "password")
```

**PHP:**
```php
$client = new RestClient('https://api.dataforseo.com/', null, 'login', 'password');
```

**Node.js:**
```javascript
const axios = require('axios');

axios({
    method: 'get',
    url: 'https://api.dataforseo.com/v3/serp/google/organic/task_post',
    auth: {
        username: 'login',
        password: 'password'
    },
    data: [{ keyword: "example", location_code: 2840 }],
    headers: { 'Content-Type': 'application/json' }
});
```

**cURL:**
```bash
curl --request POST "https://api.dataforseo.com/v3/serp/google/organic/task_post" \
--header "Authorization: Basic bG9naW46cGFzc3dvcmQ=" \
--header "Content-Type: application/json" \
--data "[{\"keyword\": \"example\", \"location_code\": 2840}]"
```

---

## API Categories

### SERP API

Provides search engine results across major platforms including Google, Bing, YouTube, Yahoo, Baidu, Naver, and Seznam.

**Base Endpoint:** `https://api.dataforseo.com/v3/serp/`

#### Supported Search Engines & Features

| Engine | Endpoints |
|--------|-----------|
| Google | Organic, Maps, Local Finder, News, Images, Jobs, Autocomplete, Events, Shopping |
| Bing | Organic, Local Pack, News, Images |
| YouTube | Organic, Video Info |
| Yahoo | Organic |
| Baidu | Organic |
| Naver | Organic |
| Seznam | Organic |

#### Functions

1. **Regular Function** - Returns organic and paid search results for specified keywords
2. **Advanced Function** - Comprehensive search result overviews across all SERP features
3. **HTML Function** - Raw SERP HTML pages

#### Example: Google Organic Task POST

**Endpoint:** `POST https://api.dataforseo.com/v3/serp/google/organic/task_post`

**Required Parameters:**
- `keyword` (string): Search query (max 700 characters)
- `location_code` OR `location_name` OR `location_coordinate`: Target location
- `language_code` OR `language_name`: Target language

**Optional Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `depth` | integer | Results count (default: 10, max: 700) |
| `device` | string | "desktop" or "mobile" |
| `priority` | integer | 1=normal, 2=high |
| `postback_url` | string | URL for result delivery |
| `pingback_url` | string | URL for completion notification |
| `tag` | string | Custom identifier (max 255 chars) |

**Request Example:**
```json
[
  {
    "keyword": "seo tools",
    "location_code": 2840,
    "language_code": "en",
    "device": "desktop",
    "depth": 100
  }
]
```

**Response Example:**
```json
{
  "status_code": 20000,
  "status_message": "Ok.",
  "tasks": [
    {
      "id": "12345678-1234-1234-1234-123456789012",
      "status_code": 20100,
      "status_message": "Task Created.",
      "cost": 0.0006,
      "data": {
        "keyword": "seo tools",
        "location_code": 2840
      }
    }
  ]
}
```

---

### Keywords Data API

Comprehensive keyword analysis solution supporting Google and Bing data sources.

**Base Endpoint:** `https://api.dataforseo.com/v3/keywords_data/`

#### Endpoints

**Google Ads:**
- `keywords_data/google_ads/search_volume/live` - Search volume data
- `keywords_data/google_ads/keywords_for_site/live` - Keywords for a domain
- `keywords_data/google_ads/keywords_for_keywords/live` - Related keywords
- `keywords_data/google_ads/ad_traffic_by_keywords/live` - Ad traffic metrics

**Bing Ads:**
- `keywords_data/bing/search_volume/live` - Search volume data
- `keywords_data/bing/keywords_for_site/live` - Keywords for a domain
- `keywords_data/bing/keywords_for_keywords/live` - Related keywords
- `keywords_data/bing/keyword_performance/live` - Performance metrics

**Google Trends:**
- `keywords_data/google_trends/explore/live` - Trend exploration

#### Example Request

```json
[
  {
    "keywords": ["seo", "search engine optimization"],
    "location_code": 2840,
    "language_code": "en"
  }
]
```

---

### Backlinks API

Comprehensive backlink data for domains, subdomains, and webpages.

**Base Endpoint:** `https://api.dataforseo.com/v3/backlinks/`

#### Endpoints

| Endpoint | Description |
|----------|-------------|
| `backlinks/summary/live` | Complete backlink profile overview |
| `backlinks/history/live` | Historical link-building data |
| `backlinks/backlinks/live` | List of individual backlinks |
| `backlinks/anchors/live` | Anchor text statistics |
| `backlinks/domain_pages/live` | Pages ranked by backlink count |
| `backlinks/referring_domains/live` | Backlinks by source domain |
| `backlinks/referring_networks/live` | IP addresses sending links |
| `backlinks/competitors/live` | Domains with backlink overlap |
| `backlinks/domain_intersection/live` | Cross-domain analysis |
| `backlinks/page_intersection/live` | Cross-page referring sources |
| `backlinks/timeseries_summary/live` | Historical trends |
| `backlinks/timeseries_new_lost_summary/live` | Change metrics over time |

#### Bulk Operations

Retrieve stats for up to 1,000 targets simultaneously:
- `backlinks/bulk_ranks/live`
- `backlinks/bulk_backlinks/live`
- `backlinks/bulk_spam_score/live`
- `backlinks/bulk_referring_domains/live`
- `backlinks/bulk_new_lost_backlinks/live`
- `backlinks/bulk_new_lost_referring_domains/live`

#### Example Request

```json
[
  {
    "target": "example.com",
    "limit": 100,
    "filters": ["dofollow", "=", true]
  }
]
```

---

### DataForSEO Labs API

Keyword research and search analytics from in-house databases with instant results.

**Base Endpoint:** `https://api.dataforseo.com/v3/dataforseo_labs/`

#### Supported Platforms

- **Google** - Full keyword and SERP data
- **Amazon** - Product search analytics
- **Google Play** - App store metrics
- **App Store** - iOS app analytics

#### Key Endpoints

- `dataforseo_labs/google/ranked_keywords/live` - Keywords a domain ranks for
- `dataforseo_labs/google/serp_competitors/live` - SERP competitors
- `dataforseo_labs/google/keyword_ideas/live` - Keyword suggestions
- `dataforseo_labs/google/related_keywords/live` - Related keywords
- `dataforseo_labs/google/keyword_suggestions/live` - Keyword suggestions
- `dataforseo_labs/google/domain_rank_overview/live` - Domain ranking overview
- `dataforseo_labs/google/domain_intersection/live` - Common keywords between domains

---

### OnPage API

Website crawling engine for technical SEO audits and performance evaluation.

**Base Endpoint:** `https://api.dataforseo.com/v3/on_page/`

#### Endpoints

| Endpoint | Description |
|----------|-------------|
| `on_page/task_post` | Submit website for crawling |
| `on_page/summary/{task_id}` | Overview of on-page issues |
| `on_page/pages/{task_id}` | Crawled pages with metrics |
| `on_page/pages_by_resource/{task_id}` | Pages containing specific resources |
| `on_page/resources/{task_id}` | Website resources (images, scripts) |
| `on_page/duplicate_tags/{task_id}` | Duplicate titles/descriptions |
| `on_page/duplicate_content/{task_id}` | Similar content detection |
| `on_page/links/{task_id}` | Internal and external links |
| `on_page/redirect_chains/{task_id}` | Redirect issues |
| `on_page/non_indexable/{task_id}` | Blocked pages |
| `on_page/waterfall/{task_id}` | Page speed insights |
| `on_page/keyword_density/{task_id}` | Keyword frequency analysis |
| `on_page/raw_html/{task_id}` | Retrieved page HTML |
| `on_page/lighthouse/live` | Lighthouse performance audit |
| `on_page/instant_pages` | Instant page analysis |

#### Customizable Parameters

| Parameter | Description |
|-----------|-------------|
| `checks_threshold` | Custom threshold values |
| `custom_js` | Execute custom JavaScript |
| `store_raw_html` | Store page HTML |
| `load_resources` | Fetch images, stylesheets, scripts |
| `enable_javascript` | Execute JavaScript on pages |
| `enable_browser_rendering` | Measure Core Web Vitals |
| `calculate_keyword_density` | Calculate keyword density |

---

### Domain Analytics API

Website analysis for traffic, technologies, and WHOIS data.

**Base Endpoint:** `https://api.dataforseo.com/v3/domain_analytics/`

#### Technologies API

Identifies technologies used in website construction.

- `domain_analytics/technologies/domain_technologies/live` - Technologies by domain
- `domain_analytics/technologies/domains_by_technology/live` - Domains using a technology
- `domain_analytics/technologies/technology_stats/live` - Technology statistics

#### Whois API

Domain registration data with SEO metrics.

- `domain_analytics/whois/overview/live` - Domain WHOIS overview

---

### Merchant API

E-commerce data for price monitoring and market research.

**Base Endpoint:** `https://api.dataforseo.com/v3/merchant/`

#### Supported Platforms

- **Google Shopping** - Product listings, prices, seller information
- **Amazon** - Organic and paid product results, ASIN data

#### Endpoints

| Endpoint | Description |
|----------|-------------|
| `merchant/google/products/task_post` | Google Shopping product search |
| `merchant/google/product_info/task_post` | Detailed product information |
| `merchant/google/sellers/task_post` | Seller information |
| `merchant/amazon/products/task_post` | Amazon product search |
| `merchant/amazon/asin/task_post` | ASIN-based product lookup |

---

### Content Analysis API

Brand monitoring, sentiment analysis, and citation management.

**Base Endpoint:** `https://api.dataforseo.com/v3/content_analysis/`

#### Endpoints

| Endpoint | Description |
|----------|-------------|
| `content_analysis/search/live` | Find all citations for keywords |
| `content_analysis/summary/live` | Citation data overview |
| `content_analysis/sentiment_analysis/live` | Sentiment polarity analysis |
| `content_analysis/rating_distribution/live` | Stats by content rating |
| `content_analysis/phrase_trends/live` | Citation trends by date |
| `content_analysis/category_trends/live` | Trends by category |

#### Sentiment Categories

- Polarity: Positive, Negative, Neutral
- Emotions: Anger, Happiness, Love, Sadness, Shareability, Fun

---

### Business Data API

Business reviews and information from major platforms.

**Base Endpoint:** `https://api.dataforseo.com/v3/business_data/`

#### Supported Platforms

- Google (Business Profile, Hotels)
- Trustpilot
- Tripadvisor
- Facebook
- Pinterest
- Reddit

#### Key Endpoints

| Endpoint | Description |
|----------|-------------|
| `business_data/google/my_business_info/task_post` | Business profile data |
| `business_data/google/my_business_updates/task_post` | Business updates |
| `business_data/google/reviews/task_post` | Business reviews |
| `business_data/google/hotel_searches/task_post` | Hotel search data |
| `business_data/google/hotel_info/task_post` | Hotel details |
| `business_data/trustpilot/reviews/task_post` | Trustpilot reviews |
| `business_data/tripadvisor/reviews/task_post` | Tripadvisor reviews |

---

### App Data API

Mobile application data for Google Play and Apple App Store.

**Base Endpoint:** `https://api.dataforseo.com/v3/app_data/`

#### Endpoints

| Platform | Endpoints |
|----------|-----------|
| Google Play | `app_data/google/app_searches/task_post`, `app_data/google/app_info/task_post`, `app_data/google/app_reviews/task_post`, `app_data/google/app_list/task_post` |
| App Store | `app_data/apple/app_searches/task_post`, `app_data/apple/app_info/task_post`, `app_data/apple/app_reviews/task_post`, `app_data/apple/app_list/task_post` |

---

## Rate Limits

| Limit Type | Value |
|------------|-------|
| API calls per minute | 2,000 (POST + GET combined) |
| Tasks per POST request | 100 maximum |
| Concurrent requests | 30 maximum |

Rate limit headers in responses:
- `X-RateLimit-Limit`: Maximum requests per minute
- `X-RateLimit-Remaining`: Remaining requests in current window

Contact DataForSEO support to request higher limits.

---

## Data Retrieval Methods

### Live Method

- Delivers results in real-time
- No separate POST/GET requests required
- Higher cost but immediate data availability
- Used by: Backlinks API, DataForSEO Labs API, Content Analysis API, Domain Analytics API

### Standard Method

Requires distinct POST and GET requests:

1. **POST** - Create task
2. **GET** - Retrieve results (via Tasks Ready endpoint or task ID)

**Priority Levels:**
- Normal priority (cost-effective)
- High priority (faster execution, higher cost)

**Completion Notifications:**
- `pingback_url` - GET notification when task completes
- `postback_url` - POST delivery of full results

### Tasks Ready Endpoint

Retrieve IDs of completed tasks:
```
GET https://api.dataforseo.com/v3/{api}/tasks_ready
```

---

## Error Codes

### HTTP Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 401 | Unauthorized - Invalid credentials |
| 402 | Payment Required - Check balance |
| 404 | Not Found - Endpoint doesn't exist |
| 500 | Internal Server Error |

### Internal Status Codes

#### Success Codes

| Code | Message |
|------|---------|
| 20000 | Ok |
| 20100 | Task Created |

#### Client Errors (40xxx)

| Code | Message |
|------|---------|
| 40000 | Single task per request only |
| 40006 | Maximum 100 tasks per request |
| 40100 | Not authorized |
| 40101 | Search engine returned error |
| 40102 | No Search Results |
| 40103 | Task execution failed |
| 40200 | Payment Required |
| 40202 | Rate limit exceeded (2000/min) |
| 40203 | Daily cost limit exceeded |
| 40207 | IP not whitelisted |
| 40209 | Too many concurrent requests (30 max) |
| 40210 | Insufficient Funds |
| 40401 | Task doesn't exist |
| 40501 | Invalid field in POST |
| 40502 | Empty POST body |
| 40503 | Malformed POST structure |

#### Server Errors (50xxx)

| Code | Message |
|------|---------|
| 50000 | Internal Error |
| 50100 | Not Implemented |
| 50301 | Third-party API unavailable |
| 50303 | API update in progress |
| 50401 | Timeout (>120 seconds) |
| 50402 | Target page timeout (>50 seconds) |

### Error Handling Best Practices

1. **Log all errors** with status codes for monitoring
2. **Rate limits (40202)**: Implement exponential backoff
3. **Auth failures (40100)**: Verify credentials
4. **Balance issues (40200, 40210)**: Check account balance
5. **IP whitelist (40207)**: Add IPs in dashboard settings
6. **Transient errors (50301, 50304)**: Retry after delay

**Get All Errors:**
```
GET https://api.dataforseo.com/v3/appendix/errors
```
(Free endpoint, no charges)

---

## Response Storage

| Method | Storage Duration |
|--------|------------------|
| Standard method | 30 days |
| Live method | Not stored |
| HTML results | 7 days |

---

## Additional Resources

- **API Dashboard:** https://app.dataforseo.com/
- **Pricing Calculator:** https://dataforseo.com/pricing
- **Help Center:** https://dataforseo.com/help-center
- **Sandbox Testing:** Available with API credentials
- **Support:** Contact via dashboard

---

## Quick Start Example

### Complete Python Example

```python
import requests
import base64
import json

# Credentials
login = "your_login"
password = "your_password"
credentials = base64.b64encode(f"{login}:{password}".encode()).decode()

# Headers
headers = {
    "Authorization": f"Basic {credentials}",
    "Content-Type": "application/json"
}

# Create SERP task
task_data = [{
    "keyword": "best seo tools 2025",
    "location_code": 2840,
    "language_code": "en",
    "device": "desktop",
    "depth": 100
}]

response = requests.post(
    "https://api.dataforseo.com/v3/serp/google/organic/task_post",
    headers=headers,
    data=json.dumps(task_data)
)

result = response.json()
task_id = result["tasks"][0]["id"]
print(f"Task created: {task_id}")

# Retrieve results (after task completes)
response = requests.get(
    f"https://api.dataforseo.com/v3/serp/google/organic/task_get/advanced/{task_id}",
    headers=headers
)

results = response.json()
print(json.dumps(results, indent=2))
```

### Complete Node.js Example

```javascript
const axios = require('axios');

const login = 'your_login';
const password = 'your_password';

const client = axios.create({
    baseURL: 'https://api.dataforseo.com/v3',
    auth: { username: login, password: password },
    headers: { 'Content-Type': 'application/json' }
});

async function getSerpResults() {
    // Create task
    const taskResponse = await client.post('/serp/google/organic/task_post', [{
        keyword: 'best seo tools 2025',
        location_code: 2840,
        language_code: 'en',
        device: 'desktop',
        depth: 100
    }]);

    const taskId = taskResponse.data.tasks[0].id;
    console.log(`Task created: ${taskId}`);

    // Wait for completion (in production, use pingback/postback)
    await new Promise(resolve => setTimeout(resolve, 30000));

    // Get results
    const results = await client.get(`/serp/google/organic/task_get/advanced/${taskId}`);
    console.log(JSON.stringify(results.data, null, 2));
}

getSerpResults().catch(console.error);
```
