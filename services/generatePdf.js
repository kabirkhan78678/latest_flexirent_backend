import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

export const generatePdfService = async (propertyData) => {
    const {
        startDate,
        endDate,
        propertyTitle,
        description,
        guestName,
        hostName,
        price,
        address
    } = propertyData;
    let appLogo = process.env.APP_LOGO;

    const outputPath = path.join(
        process.cwd(),
        "public/profile",
        `generated_property_${Date.now()}.pdf`
    );

    return new Promise((resolve, reject) => {
        const doc = new PDFDocument({
            margin: 50,
            size: 'A4',
            bufferPages: true
        });

        const stream = fs.createWriteStream(outputPath);
        doc.pipe(stream);

        /* -------------------------------------
         * HELPER FUNCTIONS
         * ------------------------------------- */
        const formatDate = (dateString) => {
            try {
                const date = new Date(dateString);
                return date.toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                });
            } catch (error) {
                return dateString;
            }
        };

        const addSectionHeader = (title, yPosition) => {
            doc.fontSize(14)
                .font('Helvetica-Bold')
                .fillColor('#2c3e50')
                .text(title, 50, yPosition)
                .moveDown(0.5);
            return yPosition + 25; // Return next Y position
        };

        const addPropertyRow = (label, value, yPosition) => {
            doc.font('Helvetica-Bold').fontSize(11)
                .text(`${label}:`, 50, yPosition, { width: 130 });
            doc.font('Helvetica').fontSize(11)
                .text(value, 180, yPosition, { width: 350 });
            return yPosition + 20; // Return next Y position
        };

        /* -------------------------------------
         * TRACK Y POSITIONS
         * ------------------------------------- */
        let currentY = 50; // Start position

        /* -------------------------------------
         * HEADER WITH LOGO & TITLE
         * ------------------------------------- */
        const logoWidth = 80;
        const logoHeight = 40;

        try {
            if (appLogo && fs.existsSync(appLogo)) {
                doc.image(appLogo, 50, currentY, {
                    width: logoWidth,
                    height: logoHeight
                });
                // If logo is on left, adjust title position
                currentY = Math.max(currentY, 60); // Ensure enough space
            }
        } catch (error) {
            console.log('Logo not loaded:', error.message);
        }

        // Title centered
        doc.fontSize(24)
            .font('Helvetica-Bold')
            .fillColor('#2c3e50')
            .text("PROPERTY RENT AGREEMENT", 50, currentY, {
                width: 500,
                align: "center"
            });

        currentY += 40; // Space after title

        // Add a decorative line
        doc.lineWidth(2)
            .strokeColor('#3498db')
            .moveTo(50, currentY)
            .lineTo(550, currentY)
            .stroke();

        currentY += 30; // Space after line

        /* -------------------------------------
         * AGREEMENT DETAILS SECTION
         * ------------------------------------- */
        currentY = addSectionHeader("AGREEMENT DETAILS", currentY);

        // Add property details with proper spacing
        currentY = addPropertyRow("Property Title", propertyTitle, currentY);
        currentY = addPropertyRow("Address", address, currentY);
        currentY = addPropertyRow("Monthly Rent", `$${price}`, currentY);
        currentY = addPropertyRow("Lease Start Date", formatDate(startDate), currentY);
        currentY = addPropertyRow("Lease End Date", formatDate(endDate), currentY);

        currentY += 20; // Extra space before next section

        /* -------------------------------------
         * PROPERTY DESCRIPTION SECTION
         * ------------------------------------- */
        currentY = addSectionHeader("PROPERTY DESCRIPTION", currentY);

        doc.font('Helvetica').fontSize(11).fillColor('#34495e')
            .text(description || "No description provided", 50, currentY, {
                width: 500,
                align: 'left'
            });

        // Calculate how much space the description took
        const descriptionHeight = doc.heightOfString(description || "No description provided", {
            width: 500
        });

        currentY += descriptionHeight + 30; // Space after description

        /* -------------------------------------
         * PARTIES INVOLVED SECTION
         * ------------------------------------- */
        currentY = addSectionHeader("PARTIES INVOLVED", currentY);

        const boxWidth = 250;
        const boxHeight = 100;
        const boxSpacing = 20;

        // GUEST BOX (Left)
        const guestBoxY = currentY;
        doc.rect(50, guestBoxY, boxWidth, boxHeight)
            .fill('#f8f9fa')
            .stroke('#ecf0f1');

        doc.font('Helvetica-Bold').fontSize(12).fillColor('#2c3e50')
            .text('GUEST', 60, guestBoxY + 15);

        doc.font('Helvetica').fontSize(11).fillColor('#34495e')
            .text(`Name: ${guestName}`, 60, guestBoxY + 40);

        // HOST BOX (Right)
        const hostBoxY = currentY;
        doc.rect(50 + boxWidth + boxSpacing, hostBoxY, boxWidth, boxHeight)
            .fill('#f8f9fa')
            .stroke('#ecf0f1');

        doc.font('Helvetica-Bold').fontSize(12).fillColor('#2c3e50')
            .text('HOST', 60 + boxWidth + boxSpacing, hostBoxY + 15);

        doc.font('Helvetica').fontSize(11).fillColor('#34495e')
            .text(`Name: ${hostName}`, 60 + boxWidth + boxSpacing, hostBoxY + 40);

        currentY += boxHeight + 40; // Space after boxes

        /* -------------------------------------
         * SIGNATURES SECTION
         * ------------------------------------- */
        currentY = addSectionHeader("SIGNATURES", currentY);

        const signatureBoxWidth = 200;
        const signatureBoxHeight = 60;
        const signatureSpacing = 50;

        // Guest Signature Section
        doc.font('Helvetica-Bold').fontSize(11)
            .text('Guest Signature:', 50, currentY);

        doc.rect(50, currentY + 20, signatureBoxWidth, signatureBoxHeight)
            .stroke('#7f8c8d');

        doc.font('Helvetica').fontSize(9).fillColor('#95a5a6')
            .text('Signature', 50 + (signatureBoxWidth / 2), currentY + 45, {
                align: 'center',
                width: signatureBoxWidth
            });

        doc.font('Helvetica').fontSize(10)
            .text(guestName, 50, currentY + signatureBoxHeight + 30);

        // Host Signature Section
        const hostSignatureX = 50 + signatureBoxWidth + signatureSpacing;

        doc.font('Helvetica-Bold').fontSize(11)
            .text('Host Signature:', hostSignatureX, currentY);

        doc.rect(hostSignatureX, currentY + 20, signatureBoxWidth, signatureBoxHeight)
            .stroke('#7f8c8d');

        doc.font('Helvetica').fontSize(9).fillColor('#95a5a6')
            .text('Signature', hostSignatureX + (signatureBoxWidth / 2), currentY + 45, {
                align: 'center',
                width: signatureBoxWidth
            });

        doc.font('Helvetica').fontSize(10)
            .text(hostName, hostSignatureX, currentY + signatureBoxHeight + 30);

        currentY += signatureBoxHeight + 60; // Space after signatures

        /* -------------------------------------
         * FOOTER
         * ------------------------------------- */
        const pageHeight = doc.page.height;

        // Add page border if needed
        doc.rect(40, 40, 520, pageHeight - 80).stroke('#f0f0f0');

        // Footer line
        doc.lineWidth(1)
            .strokeColor('#e0e0e0')
            .moveTo(50, pageHeight - 80)
            .lineTo(550, pageHeight - 80)
            .stroke();

        // Footer text
        doc.fontSize(9)
            .fillColor('#7f8c8d')
            .text("Generated by Flexsi Rent System", 50, pageHeight - 65, {
                align: "center",
                width: 500
            });

        doc.fontSize(8)
            .fillColor("#95a5a6")
            .text(`Document ID: PROP-${Date.now()} | Generated on: ${new Date().toLocaleDateString()}`,
                50, pageHeight - 50, {
                align: "center",
                width: 500
            });

        /* -------------------------------------
         * ADD PAGE NUMBERS
         * ------------------------------------- */
        const pages = doc.bufferedPageRange();
        for (let i = 0; i < pages.count; i++) {
            doc.switchToPage(i);
            doc.fontSize(8)
                .fillColor('#95a5a6')
                .text(`Page ${i + 1} of ${pages.count}`,
                    500, doc.page.height - 30);
        }

        doc.end();

        stream.on("finish", () => resolve(outputPath));
        stream.on("error", (error) => {
            console.error('PDF generation error:', error);
            reject(error);
        });
    });
};