/**
 * Import Contacts via API Server
 * Works while the app is running - uses the HTTP API at localhost:3939
 *
 * Usage: node electron/scripts/import-contacts-via-api.js <path-to-csv>
 * Example: node electron/scripts/import-contacts-via-api.js "C:\Users\myers\Documents\Downloads\contacts.csv"
 */

const fs = require('fs');
const http = require('http');

// Helper: Generate slug from name
function generateSlug(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// Helper: Clean phone number - remove formatting and take first number only
function cleanPhoneNumber(phoneStr) {
  if (!phoneStr) return null;

  // Split by ::: separator and take first
  const firstNumber = phoneStr.split(':::')[0].trim();

  // Remove all non-digit characters except + at start
  let cleaned = firstNumber.replace(/[\s\(\)\-\.]/g, '');

  // Keep leading + for international numbers
  if (cleaned.startsWith('+')) {
    cleaned = '+' + cleaned.substring(1).replace(/\D/g, '');
  } else {
    cleaned = cleaned.replace(/\D/g, '');
  }

  return cleaned || null;
}

// Helper: Combine name parts
function buildFullName(firstName, middleName, lastName) {
  const parts = [firstName, middleName, lastName].filter(p => p && p.trim());
  return parts.join(' ').trim();
}

// Helper: Parse CSV line (handles quoted fields with commas)
function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current); // Last field

  return result.map(field => field.trim());
}

// Helper: Extract all emails from CSV row
function extractEmails(row, headers) {
  const emails = [];
  for (let i = 1; i <= 4; i++) {
    const emailIdx = headers.indexOf(`E-mail ${i} - Value`);
    if (emailIdx !== -1 && row[emailIdx]) {
      emails.push(row[emailIdx].trim());
    }
  }
  return emails.filter(e => e)[0] || null; // Return first email only
}

// Helper: Extract all phones from CSV row
function extractPhones(row, headers) {
  const phones = [];
  for (let i = 1; i <= 4; i++) {
    const phoneIdx = headers.indexOf(`Phone ${i} - Value`);
    if (phoneIdx !== -1 && row[phoneIdx]) {
      const cleaned = cleanPhoneNumber(row[phoneIdx]);
      if (cleaned) phones.push(cleaned);
    }
  }
  return phones.filter(p => p).join(', ') || null;
}

// Helper: Extract address
function extractAddress(row, headers) {
  const formattedIdx = headers.indexOf('Address 1 - Formatted');
  if (formattedIdx !== -1 && row[formattedIdx]) {
    return row[formattedIdx].trim();
  }

  // Build from components if formatted not available
  const components = [];
  const streetIdx = headers.indexOf('Address 1 - Street');
  const cityIdx = headers.indexOf('Address 1 - City');
  const regionIdx = headers.indexOf('Address 1 - Region');
  const postalIdx = headers.indexOf('Address 1 - Postal Code');
  const countryIdx = headers.indexOf('Address 1 - Country');

  if (streetIdx !== -1 && row[streetIdx]) components.push(row[streetIdx]);
  if (cityIdx !== -1 && row[cityIdx]) components.push(row[cityIdx]);
  if (regionIdx !== -1 && row[regionIdx]) components.push(row[regionIdx]);
  if (postalIdx !== -1 && row[postalIdx]) components.push(row[postalIdx]);
  if (countryIdx !== -1 && row[countryIdx]) components.push(row[countryIdx]);

  return components.join(', ') || null;
}

// Helper: Make HTTP POST request to API
function apiRequest(contact) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(contact);

    const options = {
      hostname: 'localhost',
      port: 3939,
      path: '/api/contacts',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
      }
    };

    const req = http.request(options, (res) => {
      let responseData = '';

      res.on('data', (chunk) => {
        responseData += chunk;
      });

      res.on('end', () => {
        try {
          const result = JSON.parse(responseData);
          if (res.statusCode === 200 && result.success) {
            resolve(result);
          } else {
            reject(new Error(result.error || `HTTP ${res.statusCode}`));
          }
        } catch (err) {
          reject(new Error(`Invalid JSON response: ${responseData}`));
        }
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    req.write(data);
    req.end();
  });
}

// Main import function
async function importContacts(csvPath) {
  console.log('📥 Starting contact import via API...\n');

  // Check API server
  console.log('🔌 Checking API server...');
  try {
    await new Promise((resolve, reject) => {
      http.get('http://localhost:3939/api/health', (res) => {
        if (res.statusCode === 200) {
          console.log('✅ API server is running\n');
          resolve();
        } else {
          reject(new Error(`API server returned ${res.statusCode}`));
        }
      }).on('error', reject);
    });
  } catch (err) {
    console.error('❌ API server not available:', err.message);
    console.error('   Make sure AI Command Center is running!');
    process.exit(1);
  }

  // Read CSV file
  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  const lines = csvContent.split('\n').filter(line => line.trim());

  if (lines.length < 2) {
    console.error('❌ CSV file is empty or has no data rows');
    process.exit(1);
  }

  // Parse header
  const headers = parseCSVLine(lines[0]);
  console.log(`📋 Found ${headers.length} columns in CSV`);
  console.log(`📄 Processing ${lines.length - 1} rows...\n`);

  // Get header indices
  const firstNameIdx = headers.indexOf('First Name');
  const middleNameIdx = headers.indexOf('Middle Name');
  const lastNameIdx = headers.indexOf('Last Name');
  const companyIdx = headers.indexOf('Organization Name');
  const titleIdx = headers.indexOf('Organization Title');
  const notesIdx = headers.indexOf('Notes');
  const birthdayIdx = headers.indexOf('Birthday');

  let imported = 0;
  let skipped = 0;
  let errors = 0;

  // Process each row
  for (let i = 1; i < lines.length; i++) {
    const row = parseCSVLine(lines[i]);

    // Extract name
    const firstName = firstNameIdx !== -1 ? row[firstNameIdx] : '';
    const middleName = middleNameIdx !== -1 ? row[middleNameIdx] : '';
    const lastName = lastNameIdx !== -1 ? row[lastNameIdx] : '';
    const fullName = buildFullName(firstName, middleName, lastName);

    // Extract contact info
    const email = extractEmails(row, headers);
    const phones = extractPhones(row, headers);
    const company = companyIdx !== -1 ? row[companyIdx] : null;
    const title = titleIdx !== -1 ? row[titleIdx] : null;
    const address = extractAddress(row, headers);
    const notes = notesIdx !== -1 ? row[notesIdx] : null;
    const birthday = birthdayIdx !== -1 ? row[birthdayIdx] : null;

    // Skip if no useful data
    if (!fullName && !email && !phones) {
      skipped++;
      continue;
    }

    // Build notes field
    let finalNotes = [];
    if (notes) finalNotes.push(notes);
    if (birthday) finalNotes.push(`Birthday: ${birthday}`);
    if (phones) finalNotes.push(`Phone: ${phones}`);
    const combinedNotes = finalNotes.join('\n\n') || null;

    // Prepare contact object
    const contact = {
      name: fullName || 'Unknown',
      email: email,
      company: company,
      title: title,
      location: address,
      priority: 'medium',
      notes: combinedNotes
    };

    // Send to API
    try {
      await apiRequest(contact);
      imported++;

      if (imported % 25 === 0) {
        console.log(`✅ Imported ${imported} contacts...`);
      }
    } catch (err) {
      errors++;
      if (err.message.includes('UNIQUE constraint failed')) {
        // Duplicate - skip silently
      } else {
        console.error(`❌ Error importing row ${i}:`, err.message);
        console.error(`   Name: ${contact.name}, Email: ${contact.email}`);
      }
    }

    // Rate limit to avoid overwhelming the API
    if (i % 10 === 0) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  console.log('\n✨ Import complete!\n');
  console.log(`📊 Summary:`);
  console.log(`   ✅ Imported: ${imported}`);
  console.log(`   ⏭️  Skipped (no data): ${skipped}`);
  console.log(`   ❌ Errors: ${errors}`);
  console.log(`   📄 Total rows processed: ${lines.length - 1}\n`);
}

// Main execution
if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error('❌ Usage: node import-contacts-via-api.js <path-to-csv>');
    console.error('   Example: node import-contacts-via-api.js "C:\\Users\\myers\\Documents\\Downloads\\contacts.csv"');
    process.exit(1);
  }

  const csvPath = args[0];

  if (!fs.existsSync(csvPath)) {
    console.error(`❌ CSV file not found: ${csvPath}`);
    process.exit(1);
  }

  console.log(`📂 CSV File: ${csvPath}\n`);

  importContacts(csvPath).catch(err => {
    console.error('\n❌ Fatal error:', err);
    process.exit(1);
  });
}
