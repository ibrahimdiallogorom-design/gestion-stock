package com.example.gestionstock.utils

import android.content.Context
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.pdf.PdfDocument
import android.os.Environment
import com.example.gestionstock.data.local.entity.ProductEntity
import com.example.gestionstock.data.local.entity.SaleEntity
import java.io.File
import java.io.FileOutputStream
import java.text.SimpleDateFormat
import java.util.*

object PdfReportGenerator {

    fun generateMonthlyReport(
        context: Context,
        yearMonth: String, // format "YYYY-MM"
        sales: List<SaleEntity>,
        products: List<ProductEntity>,
        totalCost: Double,
        enterpriseName: String
    ): File? {
        val pdfDocument = PdfDocument()
        val pageInfo = PdfDocument.PageInfo.Builder(595, 842, 1).create() // format A4
        val page = pdfDocument.startPage(pageInfo)
        val canvas: Canvas = page.canvas

        val paint = Paint()
        val titlePaint = Paint().apply {
            color = Color.rgb(30, 58, 95) // Deep Blue
            textSize = 20f
            isFakeBoldText = true
        }
        
        val headerPaint = Paint().apply {
            color = Color.rgb(0, 180, 216) // Teal Accent
            textSize = 14f
            isFakeBoldText = true
        }

        val textPaint = Paint().apply {
            color = Color.BLACK
            textSize = 11f
        }

        val boldTextPaint = Paint().apply {
            color = Color.BLACK
            textSize = 11f
            isFakeBoldText = true
        }

        val tableHeaderPaint = Paint().apply {
            color = Color.WHITE
            textSize = 11f
            isFakeBoldText = true
        }

        val rectPaint = Paint().apply {
            color = Color.rgb(240, 240, 240)
        }

        val darkRectPaint = Paint().apply {
            color = Color.rgb(30, 58, 95)
        }

        val linePaint = Paint().apply {
            color = Color.LTGRAY
            strokeWidth = 1f
        }

        var y = 40f

        // Enterprise Header
        canvas.drawText(enterpriseName.uppercase(Locale.getDefault()), 40f, y, titlePaint)
        y += 24f
        val sdf = SimpleDateFormat("dd/MM/yyyy HH:mm", Locale.getDefault())
        canvas.drawText("Date de génération : ${sdf.format(Date())}", 40f, y, textPaint)
        y += 30f

        // Document Title
        canvas.drawText("RAPPORT D'ACTIVITÉ MENSUEL - $yearMonth", 40f, y, headerPaint)
        y += 10f
        canvas.drawLine(40f, y, 555f, y, Paint().apply { color = Color.rgb(0, 180, 216); strokeWidth = 2f })
        y += 30f

        // Financial Summary Box
        canvas.drawRect(40f, y, 555f, y + 80f, rectPaint)
        
        val totalRevenue = sales.sumOf { it.totalAmount }
        val netRevenue = totalRevenue - sales.sumOf { it.discountAmount }

        canvas.drawText("RÉSUMÉ FINANCIER", 55f, y + 25f, boldTextPaint)
        canvas.drawText("Chiffre d'Affaires Brut : ${String.format(Locale.US, "%,.2f", totalRevenue)} FCFA", 55f, y + 45f, textPaint)
        canvas.drawText("Chiffre d'Affaires Net : ${String.format(Locale.US, "%,.2f", netRevenue)} FCFA", 55f, y + 65f, textPaint)

        y += 100f

        // Inventory Value Summary
        val totalStockValue = products.sumOf { it.stockQuantity * it.purchasePrice }
        val totalStockPotentialSaleValue = products.sumOf { it.stockQuantity * it.salePrice }
        val potentialProfit = totalStockPotentialSaleValue - totalStockValue

        canvas.drawText("VALEUR DU STOCK ACTUEL", 40f, y, headerPaint)
        y += 15f
        canvas.drawText("Valeur d'achat totale en magasin : ${String.format(Locale.US, "%,.2f", totalStockValue)} FCFA", 40f, y, textPaint)
        y += 18f
        canvas.drawText("Valeur de vente potentielle totale : ${String.format(Locale.US, "%,.2f", totalStockPotentialSaleValue)} FCFA", 40f, y, textPaint)
        y += 18f
        canvas.drawText("Marge brute potentielle estimée : ${String.format(Locale.US, "%,.2f", potentialProfit)} FCFA", 40f, y, textPaint)
        
        y += 35f

        // Recent Sales Table Header
        canvas.drawText("RÉCAPITULATIF DES TRANSACTIONS DU MOIS", 40f, y, headerPaint)
        y += 15f

        canvas.drawRect(40f, y, 555f, y + 22f, darkRectPaint)
        canvas.drawText("ID Vente", 50f, y + 15f, tableHeaderPaint)
        canvas.drawText("Date", 130f, y + 15f, tableHeaderPaint)
        canvas.drawText("Paiement", 250f, y + 15f, tableHeaderPaint)
        canvas.drawText("Montant Net", 440f, y + 15f, tableHeaderPaint)
        y += 22f

        // Show top transactions (limit to fit on A4)
        val limitSales = sales.take(15)
        val sdfDate = SimpleDateFormat("dd/MM/yyyy", Locale.getDefault())
        limitSales.forEach { sale ->
            canvas.drawText("#${sale.id}", 50f, y + 15f, textPaint)
            canvas.drawText(sdfDate.format(Date(sale.createdAt)), 130f, y + 15f, textPaint)
            canvas.drawText(sale.paymentMethod, 250f, y + 15f, textPaint)
            canvas.drawText("${String.format(Locale.US, "%,.2f", sale.totalAmount)} FCFA", 440f, y + 15f, textPaint)
            
            y += 20f
            canvas.drawLine(40f, y, 555f, y, linePaint)
        }

        pdfDocument.finishPage(page)

        // Save PDF to downloads directory
        val fileName = "Rapport_$yearMonth.pdf"
        val downloadsDir = context.getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS)
        if (downloadsDir != null && !downloadsDir.exists()) {
            downloadsDir.mkdirs()
        }
        val file = File(downloadsDir, fileName)

        return try {
            val fileOutputStream = FileOutputStream(file)
            pdfDocument.writeTo(fileOutputStream)
            pdfDocument.close()
            fileOutputStream.close()
            file
        } catch (e: Exception) {
            e.printStackTrace()
            pdfDocument.close()
            null
        }
    }
}
