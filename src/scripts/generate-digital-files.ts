// scripts/generate-digital-files.ts
// This script creates REAL downloadable files for testing

import fs from 'fs';
import path from 'path';
import archiver from 'archiver';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

const OUTPUT_DIR = path.join(__dirname, '../public/downloads');

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

console.log('📦 Generating real downloadable files...\n');

// ============================================================
// 1. CREATE PDF FILES (E-books, Planners, Templates)
// ============================================================

async function createPDF(fileName: string, title: string, content: string[]) {
  const pdfDoc = await PDFDocument.create();
  const timesRomanFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);
  const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // Title page
  let page = pdfDoc.addPage([595, 842]); // A4 size
  page.drawText(title, {
    x: 50,
    y: 750,
    size: 24,
    font: helveticaBold,
    color: rgb(0, 0, 0),
  });

  page.drawText('VendorSpot Digital Product', {
    x: 50,
    y: 720,
    size: 12,
    font: helveticaFont,
    color: rgb(0.5, 0.5, 0.5),
  });

  page.drawText(`© ${new Date().getFullYear()} VendorSpot. All rights reserved.`, {
    x: 50,
    y: 50,
    size: 10,
    font: helveticaFont,
    color: rgb(0.5, 0.5, 0.5),
  });

  // Content pages
  let yPosition = 650;
  for (const paragraph of content) {
    if (yPosition < 100) {
      page = pdfDoc.addPage([595, 842]);
      yPosition = 750;
    }

    const words = paragraph.split(' ');
    let line = '';
    
    for (const word of words) {
      const testLine = line + word + ' ';
      const width = timesRomanFont.widthOfTextAtSize(testLine, 12);
      
      if (width > 495) {
        page.drawText(line, {
          x: 50,
          y: yPosition,
          size: 12,
          font: timesRomanFont,
          color: rgb(0, 0, 0),
        });
        line = word + ' ';
        yPosition -= 20;
      } else {
        line = testLine;
      }
    }
    
    page.drawText(line, {
      x: 50,
      y: yPosition,
      size: 12,
      font: timesRomanFont,
      color: rgb(0, 0, 0),
    });
    
    yPosition -= 30;
  }

  const pdfBytes = await pdfDoc.save();
  const filePath = path.join(OUTPUT_DIR, fileName);
  fs.writeFileSync(filePath, pdfBytes);
  console.log(`✅ Created PDF: ${fileName} (${(pdfBytes.length / 1024).toFixed(2)} KB)`);
}

// ============================================================
// 2. CREATE ZIP FILES (Courses, Templates, Graphics)
// ============================================================

async function createZip(fileName: string, contents: { name: string; content: string }[]) {
  return new Promise<void>((resolve, reject) => {
    const output = fs.createWriteStream(path.join(OUTPUT_DIR, fileName));
    const archive = archiver('zip', { zlib: { level: 9 } });

    output.on('close', () => {
      console.log(`✅ Created ZIP: ${fileName} (${(archive.pointer() / 1024).toFixed(2)} KB)`);
      resolve();
    });

    archive.on('error', (err) => reject(err));
    archive.pipe(output);

    // Add files to zip
    for (const file of contents) {
      archive.append(file.content, { name: file.name });
    }

    archive.finalize();
  });
}

// ============================================================
// 3. GENERATE ALL DIGITAL PRODUCTS
// ============================================================

async function generateAllFiles() {
  try {
    // 1. Financial Literacy E-Book (PDF)
    await createPDF(
      'financial-literacy-guide.pdf',
      'Financial Literacy Guide',
      [
        'Chapter 1: Introduction to Personal Finance',
        'Understanding the basics of personal finance is crucial for building long-term wealth and financial security. This guide will walk you through essential concepts including budgeting, saving, investing, and retirement planning.',
        '',
        'Chapter 2: Creating Your Budget',
        'A budget is the foundation of financial success. Learn how to track your income and expenses, identify areas for improvement, and create a realistic spending plan that aligns with your financial goals.',
        '',
        'Chapter 3: Building an Emergency Fund',
        'An emergency fund is essential for financial stability. Discover how to save 3-6 months of expenses, where to keep your emergency money, and when to use it.',
        '',
        'Chapter 4: Introduction to Investing',
        'Learn the fundamentals of investing including stocks, bonds, mutual funds, and ETFs. Understand risk tolerance, diversification, and how to start building your investment portfolio.',
        '',
        'Chapter 5: Retirement Planning',
        'Planning for retirement is one of the most important financial goals. Learn about retirement accounts, compound interest, and strategies to ensure a comfortable retirement.',
      ]
    );

    // 2. Business Plan Templates (ZIP with multiple files)
    await createZip('business-plan-templates-pack.zip', [
      {
        name: 'README.txt',
        content: 'Business Plan Templates Pack\n\nThis package contains 50+ professional business plan templates.\n\nContents:\n- Executive Summary Templates\n- Financial Projections\n- Market Analysis Templates\n- Pitch Deck Templates\n\n© VendorSpot 2026',
      },
      {
        name: 'executive-summary-template.txt',
        content: 'EXECUTIVE SUMMARY TEMPLATE\n\n1. Company Overview\n[Brief description of your company]\n\n2. Mission Statement\n[Your company mission]\n\n3. Products/Services\n[What you offer]\n\n4. Target Market\n[Who your customers are]\n\n5. Financial Highlights\n[Key financial metrics]\n\n6. Funding Requirements\n[If applicable]',
      },
      {
        name: 'financial-projections.txt',
        content: 'FINANCIAL PROJECTIONS TEMPLATE\n\nYear 1:\nRevenue: $________\nExpenses: $________\nProfit: $________\n\nYear 2:\nRevenue: $________\nExpenses: $________\nProfit: $________\n\nYear 3:\nRevenue: $________\nExpenses: $________\nProfit: $________',
      },
      {
        name: 'market-analysis.txt',
        content: 'MARKET ANALYSIS TEMPLATE\n\n1. Industry Overview\n[Industry description]\n\n2. Target Market\n[Customer demographics]\n\n3. Market Size\n[TAM, SAM, SOM]\n\n4. Competition\n[Competitor analysis]\n\n5. Market Trends\n[Key trends affecting your business]',
      },
    ]);

    // 3. Resume Templates (ZIP)
    await createZip('resume-templates-collection.zip', [
      {
        name: 'README.txt',
        content: 'Resume Templates Collection\n\n30 ATS-friendly resume templates included.\n\nFormats: Word (.docx) compatible\n\nTemplates included:\n- Professional\n- Creative\n- Modern\n- Executive\n- Entry-Level\n\n© VendorSpot 2026',
      },
      {
        name: 'professional-resume.txt',
        content: '[YOUR NAME]\n[Your Address] | [Phone] | [Email]\n\nPROFESSIONAL SUMMARY\n[2-3 sentences about your experience and skills]\n\nWORK EXPERIENCE\n\nJob Title | Company Name | Date Range\n• Achievement or responsibility\n• Achievement or responsibility\n• Achievement or responsibility\n\nEDUCATION\n\nDegree | University Name | Year\n\nSKILLS\n• Skill 1\n• Skill 2\n• Skill 3',
      },
    ]);

    // 4. Digital Planner (PDF)
    await createPDF(
      'productivity-planner-digital.pdf',
      'Productivity Planner 2026',
      [
        'Welcome to Your Digital Productivity Planner',
        'This planner is designed to help you organize your life, set goals, and track your progress throughout the year.',
        '',
        'Monthly Goals Template:',
        '• Goal 1: ________________',
        '• Goal 2: ________________',
        '• Goal 3: ________________',
        '',
        'Weekly Planning Template:',
        'Monday: ________________',
        'Tuesday: ________________',
        'Wednesday: ________________',
        'Thursday: ________________',
        'Friday: ________________',
        '',
        'Daily Task List:',
        '□ Task 1',
        '□ Task 2',
        '□ Task 3',
        '□ Task 4',
        '□ Task 5',
        '',
        'Habit Tracker:',
        'Track your daily habits and build consistency.',
        '',
        'Notes Section:',
        'Use this space for brainstorming, meeting notes, or creative ideas.',
      ]
    );

    // 5. Course Materials (ZIP) - Example: Full-Stack Bootcamp
    await createZip('fullstack-web-development-bootcamp.zip', [
      {
        name: 'README.txt',
        content: 'Full-Stack Web Development Bootcamp\n\nCourse Contents:\n- HTML & CSS Fundamentals\n- JavaScript Mastery\n- React.js Framework\n- Node.js Backend\n- MongoDB Database\n- Deployment & DevOps\n\nTotal: 80+ hours of content\n20+ Projects included\n\nAccess the course at: https://courses.vendorspot.com\n\n© VendorSpot 2026',
      },
      {
        name: 'module-1-html-css.txt',
        content: 'Module 1: HTML & CSS Fundamentals\n\nLessons:\n1. Introduction to HTML\n2. HTML Elements and Structure\n3. CSS Basics\n4. CSS Layouts (Flexbox & Grid)\n5. Responsive Design\n\nProject: Build a Portfolio Website\n\nResources:\n- HTML Cheat Sheet\n- CSS Reference Guide\n- Responsive Design Best Practices',
      },
      {
        name: 'module-2-javascript.txt',
        content: 'Module 2: JavaScript Mastery\n\nLessons:\n1. JavaScript Basics\n2. Functions and Scope\n3. DOM Manipulation\n4. ES6+ Features\n5. Async JavaScript\n\nProject: Interactive To-Do App\n\nResources:\n- JavaScript Cheat Sheet\n- Common Patterns\n- Debugging Tips',
      },
      {
        name: 'projects.txt',
        content: 'Course Projects:\n\n1. Portfolio Website (HTML/CSS)\n2. Interactive To-Do List (JavaScript)\n3. Weather App (API Integration)\n4. Blog Platform (React)\n5. E-commerce Store (Full Stack)\n6. Social Media Clone (Advanced)\n\nEach project includes:\n- Step-by-step instructions\n- Starter code\n- Solution code\n- Video walkthrough',
      },
    ]);

    // 6. Photography Course (ZIP)
    await createZip('photography-masterclass.zip', [
      {
        name: 'README.txt',
        content: 'Photography Masterclass\n\n48+ hours of professional photography training\n\nWhat You\'ll Learn:\n- Camera Settings\n- Composition Techniques\n- Lighting Fundamentals\n- Photo Editing with Lightroom\n- Portrait Photography\n- Landscape Photography\n\n© VendorSpot 2026',
      },
      {
        name: 'camera-settings-guide.txt',
        content: 'Camera Settings Cheat Sheet\n\nAperture (f-stop):\n- f/1.4-f/2.8: Shallow depth of field (portraits)\n- f/5.6-f/8: Moderate depth (general)\n- f/11-f/16: Deep depth (landscapes)\n\nShutter Speed:\n- 1/1000+: Freeze motion (sports)\n- 1/125-1/250: General handheld\n- 1/60 or slower: Use tripod\n\nISO:\n- 100-400: Bright conditions\n- 800-1600: Indoor/low light\n- 3200+: Very dark (more noise)\n\nRule: Aperture for depth, Shutter for motion, ISO for brightness',
      },
    ]);

    // 7. More Templates and Courses (keeping it concise)
    await createZip('ui-ux-design-course.zip', [
      {
        name: 'README.txt',
        content: 'UI/UX Design Course\n\n50+ hours of design training\n15 design projects\n\nTools covered:\n- Figma\n- Adobe XD\n- Design Principles\n- User Research\n- Prototyping\n\n© VendorSpot 2026',
      },
    ]);

    await createZip('python-data-science.zip', [
      {
        name: 'README.txt',
        content: 'Python for Data Science\n\n60+ hours of content\n12 data science projects\n\nLibraries:\n- Pandas\n- NumPy\n- Matplotlib\n- Seaborn\n- Scikit-learn\n\n© VendorSpot 2026',
      },
    ]);

    await createZip('digital-marketing.zip', [
      {
        name: 'README.txt',
        content: 'Digital Marketing Masterclass\n\n40+ hours of training\n\nTopics:\n- SEO Fundamentals\n- Google Ads\n- Social Media Marketing\n- Email Marketing\n- Analytics\n\n© VendorSpot 2026',
      },
    ]);

    await createZip('react-native-course.zip', [
      {
        name: 'README.txt',
        content: 'React Native Mobile Development\n\n55+ hours of content\n8 mobile app projects\n\nBuild for iOS and Android\n\n© VendorSpot 2026',
      },
    ]);

    await createZip('graphic-design.zip', [
      {
        name: 'README.txt',
        content: 'Graphic Design Fundamentals\n\n45+ hours\n20+ design projects\n\nAdobe Creative Suite training\n\n© VendorSpot 2026',
      },
    ]);

    await createZip('excel-advanced.zip', [
      {
        name: 'README.txt',
        content: 'Excel Advanced Techniques\n\n35+ hours\nFormulas, Macros, VBA\n\n© VendorSpot 2026',
      },
    ]);

    await createZip('video-editing-premiere.zip', [
      {
        name: 'README.txt',
        content: 'Video Editing with Premiere Pro\n\n50+ hours\n15+ video projects\n\n© VendorSpot 2026',
      },
    ]);

    await createZip('social-media-graphics.zip', [
      {
        name: 'README.txt',
        content: 'Social Media Graphics Pack\n\n1000+ templates\nCanva & Photoshop\n\n© VendorSpot 2026',
      },
    ]);

    await createZip('meditation-audio.zip', [
      {
        name: 'README.txt',
        content: 'Meditation Audio Collection\n\n50 guided sessions\n10+ hours of audio\n\n© VendorSpot 2026',
      },
    ]);

    await createZip('logo-templates.zip', [
      {
        name: 'README.txt',
        content: 'Logo Design Templates\n\n200+ logo templates\nVector files included\n\n© VendorSpot 2026',
      },
    ]);

    await createZip('landing-page-templates.zip', [
      {
        name: 'README.txt',
        content: 'Website Landing Page Templates\n\n25 responsive templates\nHTML/CSS/Bootstrap\n\n© VendorSpot 2026',
      },
    ]);

    await createZip('music-production-course.zip', [
      {
        name: 'README.txt',
        content: 'Music Production Course\n\n60+ hours\nFL Studio training\n\n© VendorSpot 2026',
      },
    ]);

    await createZip('fitness-workout-programs.zip', [
      {
        name: 'README.txt',
        content: 'Fitness Workout Programs\n\n12-week programs\n100+ exercise videos\n\n© VendorSpot 2026',
      },
    ]);

    await createZip('business-stock-photos.zip', [
      {
        name: 'README.txt',
        content: 'Business Stock Photos\n\n500 high-res images\nCommercial license\n\n© VendorSpot 2026',
      },
    ]);

    console.log('\n✅ All files generated successfully!');
    console.log(`📁 Files location: ${OUTPUT_DIR}`);
    console.log('\n🚀 Next steps:');
    console.log('1. Copy these files to your server/storage');
    console.log('2. Update the URLs in fix-digital-products.ts to point to your actual file locations');
    console.log('3. Or serve them from your Express server using express.static');

  } catch (error) {
    console.error('❌ Error generating files:', error);
  }
}

generateAllFiles();