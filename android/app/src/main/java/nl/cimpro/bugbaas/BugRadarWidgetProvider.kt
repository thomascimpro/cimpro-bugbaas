package nl.cimpro.bugbaas

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.widget.RemoteViews
import kotlin.random.Random

class BugRadarWidgetProvider : AppWidgetProvider() {
  override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
    for (appWidgetId in appWidgetIds) {
      updateWidget(context, appWidgetManager, appWidgetId, pickRadarBug())
    }
  }

  private fun updateWidget(context: Context, manager: AppWidgetManager, widgetId: Int, bug: RadarBug) {
    val views = RemoteViews(context.packageName, R.layout.bug_radar_widget)
    views.setTextViewText(R.id.radarTitle, "BUG RADAR")
    views.setTextViewText(R.id.radarBugName, bug.name)
    views.setTextViewText(R.id.radarMeta, "${bug.rarity} signal")
    views.setTextViewText(R.id.radarAction, "Tap to catch")

    val intent = Intent(context, MainActivity::class.java).apply {
      action = Intent.ACTION_VIEW
      data = Uri.parse("bugbaas://radar?bugId=${Uri.encode(bug.id)}")
      flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
    }
    val flags = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
    } else {
      PendingIntent.FLAG_UPDATE_CURRENT
    }
    views.setOnClickPendingIntent(R.id.widgetRoot, PendingIntent.getActivity(context, widgetId, intent, flags))
    manager.updateAppWidget(widgetId, views)
  }

  private fun pickRadarBug(): RadarBug {
    val rarity = pickRarity()
    val candidates = radarBugs.filter { it.rarity == rarity }
    return candidates.randomOrNull() ?: radarBugs.random()
  }

  private fun pickRarity(): String {
    val roll = Random.nextInt(100)
    return when {
      roll < 65 -> "Gewoon"
      roll < 90 -> "Zeldzaam"
      roll < 98 -> "Episch"
      else -> "Legendarisch"
    }
  }

  private data class RadarBug(val id: String, val name: String, val rarity: String)

  companion object {
    private val radarBugs = listOf(
    RadarBug("zilvervisje", "Zilvervisje", "Gewoon"),
    RadarBug("fruitvlieg", "Fruitvlieg", "Gewoon"),
    RadarBug("bladluis", "Bladluis", "Gewoon"),
    RadarBug("mug", "Mug", "Gewoon"),
    RadarBug("mot", "Mot", "Gewoon"),
    RadarBug("mier", "Mier", "Gewoon"),
    RadarBug("vlo", "Vlo", "Gewoon"),
    RadarBug("pissebed", "Pissebed", "Gewoon"),
    RadarBug("stinkwants", "Stinkwants", "Zeldzaam"),
    RadarBug("snuitkever", "Snuitkever", "Zeldzaam"),
    RadarBug("lieveheersbeestje", "Lieveheersbeestje", "Zeldzaam"),
    RadarBug("kakkerlak", "Kakkerlak", "Gewoon"),
    RadarBug("oorworm", "Oorworm", "Gewoon"),
    RadarBug("boktor", "Boktor", "Episch"),
    RadarBug("tapijtkever", "Tapijtkever", "Zeldzaam"),
    RadarBug("roofwants", "Roofwants", "Zeldzaam"),
    RadarBug("duizendpoot", "Duizendpoot", "Zeldzaam"),
    RadarBug("sprinkhaan", "Sprinkhaan", "Zeldzaam"),
    RadarBug("wesp", "Wesp", "Zeldzaam"),
    RadarBug("hoornaar", "Hoornaar", "Episch"),
    RadarBug("schorpioen", "Schorpioen", "Legendarisch"),
    RadarBug("termiet", "Termiet", "Gewoon"),
    RadarBug("mestkever", "Mestkever", "Zeldzaam"),
    RadarBug("wandelende-tak", "Wandelende tak", "Zeldzaam"),
    RadarBug("vogelspin", "Vogelspin", "Episch"),
    RadarBug("reuzenkakkerlak", "Reuzenkakkerlak", "Episch"),
    RadarBug("reuzen-duizendpoot", "Reuzenduizendpoot", "Legendarisch"),
    RadarBug("neushoornkever", "Neushoornkever", "Legendarisch"),
    RadarBug("atlaskever", "Atlaskever", "Legendarisch"),
    RadarBug("herculeskever", "Herculeskever", "Legendarisch"),
    RadarBug("goliathkever", "Goliathkever", "Legendarisch"),
    RadarBug("motmug", "Motmug", "Gewoon"),
    RadarBug("langpootmug", "Langpootmug", "Gewoon"),
    RadarBug("faraomier", "Faraomier", "Gewoon"),
    RadarBug("boekluis", "Boekluis", "Gewoon"),
    RadarBug("stofluis", "Stofluis", "Gewoon"),
    RadarBug("teek", "Teek", "Gewoon"),
    RadarBug("fluweelmijt", "Fluweelmijt", "Gewoon"),
    RadarBug("schildwants", "Schildwants", "Zeldzaam"),
    RadarBug("houtmier", "Houtmier", "Zeldzaam"),
    RadarBug("kniptor", "Kniptor", "Zeldzaam"),
    RadarBug("loopkever", "Loopkever", "Zeldzaam"),
    RadarBug("waterkever", "Waterkever", "Zeldzaam"),
    RadarBug("schrijvertje", "Schrijvertje", "Gewoon"),
    RadarBug("schaatsenrijder", "Schaatsenrijder", "Zeldzaam"),
    RadarBug("goudtor", "Goudtor", "Zeldzaam"),
    RadarBug("tijgerkever", "Tijgerkever", "Zeldzaam"),
    RadarBug("doodgraver", "Doodgraver", "Zeldzaam"),
    RadarBug("waterschorpioen", "Waterschorpioen", "Zeldzaam"),
    RadarBug("bidsprinkhaan", "Bidsprinkhaan", "Episch"),
    RadarBug("wandelend-blad", "Wandelend blad", "Episch"),
    RadarBug("wespspin", "Wespspin", "Zeldzaam"),
    RadarBug("kruisspin", "Kruisspin", "Zeldzaam"),
    RadarBug("springspin", "Springspin", "Zeldzaam"),
    RadarBug("libel", "Libel", "Episch"),
    RadarBug("waterjuffer", "Waterjuffer", "Episch"),
    RadarBug("gaasvlieg", "Gaasvlieg", "Episch"),
    RadarBug("doodshoofdvlinder", "Doodshoofdvlinder", "Episch"),
    RadarBug("kolibrievlinder", "Kolibrievlinder", "Episch"),
    RadarBug("koninginnenpage", "Koninginnenpage", "Episch"),
    RadarBug("atalanta", "Atalanta", "Episch"),
    RadarBug("dagpauwoog", "Dagpauwoog", "Episch"),
    RadarBug("eikenprocessierups", "Eikenprocessierups", "Zeldzaam"),
    RadarBug("pijlstaartrups", "Pijlstaartrups", "Episch"),
    RadarBug("cicade", "Cicade", "Zeldzaam"),
    RadarBug("schuimcicade", "Schuimcicade", "Gewoon"),
    RadarBug("vliegend-hert", "Vliegend hert", "Legendarisch"),
    RadarBug("juweelkever", "Juweelkever", "Episch"),
    RadarBug("orchidee-bidsprinkhaan", "Orchidee-bidsprinkhaan", "Legendarisch"),
    RadarBug("pauwspin", "Pauwspin", "Episch"),
    RadarBug("juweelwesp", "Juweelwesp", "Episch"),
    RadarBug("goudschildkever", "Goudschildkever", "Episch"),
    RadarBug("harlekijnwants", "Harlekijnwants", "Episch"),
    RadarBug("lantaarnvlieg", "Lantaarnvlieg", "Episch"),
    RadarBug("vioolspin", "Vioolspin", "Episch"),
    RadarBug("gespikkelde-houtvlinder", "Gespikkelde houtvlinder", "Episch"),
    RadarBug("zebra-springspin", "Zebra-springspin", "Episch"),
    RadarBug("smaragdlibel", "Smaragdlibel", "Legendarisch"),
    RadarBug("glasvleugelvlinder", "Glasvleugelvlinder", "Episch"),
    RadarBug("komeetmot", "Komeetmot", "Episch"),
    RadarBug("maanmot", "Maanmot", "Episch"),
    RadarBug("atlasvlinder", "Atlasvlinder", "Legendarisch"),
    RadarBug("rozekever", "Rozekever", "Zeldzaam"),
    RadarBug("kardinaalkever", "Kardinaalkever", "Episch"),
    RadarBug("vuurwants", "Vuurwants", "Zeldzaam"),
    RadarBug("sabelsprinkhaan", "Sabelsprinkhaan", "Episch"),
    RadarBug("mierenleeuw", "Mierenleeuw", "Gewoon"),
    RadarBug("dobsonvlieg", "Dobsonvlieg", "Legendarisch"),
    RadarBug("helikopterjuffer", "Helikopterjuffer", "Episch"),
    RadarBug("spookinsect", "Spookinsect", "Legendarisch"),
    RadarBug("bladpootwants", "Bladpootwants", "Episch"),
    RadarBug("assassin-bug", "Assassin bug", "Legendarisch"),
    RadarBug("tijgermug", "Tijgermug", "Episch"),
    RadarBug("dolksteekwesp", "Dolksteekwesp", "Legendarisch"),
    RadarBug("roofvlieg", "Roofvlieg", "Episch"),
    RadarBug("kameelhalsvlieg", "Kameelhalsvlieg", "Episch"),
    RadarBug("zweefvlieg", "Zweefvlieg", "Gewoon"),
    RadarBug("goudwesp", "Goudwesp", "Episch"),
    RadarBug("sluipwesp", "Sluipwesp", "Zeldzaam"),
    RadarBug("fluweelmier", "Fluweelmier", "Episch"),
    RadarBug("reuzenwaterwants", "Reuzenwaterwants", "Legendarisch"),
    RadarBug("zweepschorpioen", "Zweepschorpioen", "Legendarisch"),
    RadarBug("azuren-waterjuffer", "Azuren waterjuffer", "Episch"),
    RadarBug("rouwmantelvlinder", "Rouwmantelvlinder", "Legendarisch"),
    RadarBug("keizersmantel", "Keizersmantel", "Legendarisch"),
    RadarBug("gouden-tor", "Gouden tor", "Zeldzaam"),
    RadarBug("soldaatje", "Soldaatje", "Zeldzaam"),
    RadarBug("doodgraverkever", "Doodgraverkever", "Episch"),
    RadarBug("olifantskever", "Olifantskever", "Legendarisch"),
    RadarBug("regenboogmestkever", "Regenboogmestkever", "Legendarisch"),
    RadarBug("titanus-kever", "Titanus-kever", "Legendarisch"),
    RadarBug("langsprietboktor", "Langsprietboktor", "Episch"),
    RadarBug("schildpadkever", "Schildpadkever", "Episch"),
    RadarBug("vuurkever", "Vuurkever", "Zeldzaam"),
    RadarBug("blauwe-ertsbij", "Blauwe ertsbij", "Legendarisch"),
    RadarBug("wespboktor", "Wespboktor", "Episch"),
    RadarBug("groene-zandloopkever", "Groene zandloopkever", "Legendarisch")
    )
  }
}
