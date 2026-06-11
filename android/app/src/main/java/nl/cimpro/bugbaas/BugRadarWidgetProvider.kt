package nl.cimpro.bugbaas

import android.app.PendingIntent
import android.app.AlarmManager
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.view.View
import android.widget.RemoteViews
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import java.util.Calendar
import kotlin.random.Random

class BugRadarWidgetProvider : AppWidgetProvider() {
  override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
    val bugs = activeRadarBugs(context)
    val bug = bugs.firstOrNull()
    for (appWidgetId in appWidgetIds) {
      updateWidget(context, appWidgetManager, appWidgetId, bug, bugs.size)
    }
    if (bug == null) scheduleNextSignal(context)
    MovementRadarNative.schedulePeriodicCheck(context)
  }

  override fun onReceive(context: Context, intent: Intent) {
    super.onReceive(context, intent)
    when (intent.action) {
      actionSignal -> handleRadarRoll(context)
      actionOpenBug -> handleOpenBug(context)
      else -> if (MovementRadarNative.isMovementAction(intent.action)) handleMovementRadarCheck(context)
    }
  }

  private fun handleMovementRadarCheck(context: Context) {
    val pendingResult = goAsync()
    val appContext = context.applicationContext
    CoroutineScope(Dispatchers.IO).launch {
      try {
        MovementRadarNative.claimAvailable(appContext)
      } finally {
        MovementRadarNative.schedulePeriodicCheck(appContext)
        pendingResult.finish()
      }
    }
  }

  private fun handleRadarRoll(context: Context) {
    val manager = AppWidgetManager.getInstance(context)
    val widgetIds = manager.getAppWidgetIds(ComponentName(context, BugRadarWidgetProvider::class.java))

    val activeBugs = activeRadarBugs(context)
    activeBugs.firstOrNull()?.let { bug ->
      for (widgetId in widgetIds) updateWidget(context, manager, widgetId, bug, activeBugs.size)
      return
    }

    val now = Calendar.getInstance()
    if (shouldSpawnOnRoll(context, now)) {
      val bug = pickRadarBug()
      appendActiveRadarBugs(context, listOf(bug.id))
      for (widgetId in widgetIds) updateWidget(context, manager, widgetId, bug, 1)
      noteSignal(context, now)
      return
    }

    scheduleNextSignal(context)
  }

  private fun handleOpenBug(context: Context) {
    val bugs = activeRadarBugs(context)
    val bug = bugs.firstOrNull() ?: return
    val remainingBugs = popActiveRadarBug(context)

    val manager = AppWidgetManager.getInstance(context)
    val widgetIds = manager.getAppWidgetIds(ComponentName(context, BugRadarWidgetProvider::class.java))
    for (widgetId in widgetIds) updateWidget(context, manager, widgetId, remainingBugs.firstOrNull(), remainingBugs.size)
    if (remainingBugs.isEmpty()) scheduleNextSignal(context)

    val intent = Intent(context, MainActivity::class.java).apply {
      action = Intent.ACTION_VIEW
      data = Uri.parse("bugbaas://radar?bugId=${Uri.encode(bug.id)}")
      flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
    }
    context.startActivity(intent)
  }

  override fun onAppWidgetOptionsChanged(
    context: Context,
    appWidgetManager: AppWidgetManager,
    appWidgetId: Int,
    newOptions: Bundle
  ) {
    super.onAppWidgetOptionsChanged(context, appWidgetManager, appWidgetId, newOptions)
    val bugs = activeRadarBugs(context)
    updateWidget(context, appWidgetManager, appWidgetId, bugs.firstOrNull(), bugs.size)
  }

  private fun updateWidget(context: Context, manager: AppWidgetManager, widgetId: Int, bug: RadarBug?, stackCount: Int) {
    val compact = isCompactWidget(manager.getAppWidgetOptions(widgetId))
    val layout = if (compact) R.layout.bug_radar_widget_compact else R.layout.bug_radar_widget
    val views = RemoteViews(context.packageName, layout)
    views.setViewVisibility(R.id.radarStatus, View.GONE)
    views.setViewVisibility(R.id.radarBugImage, if (bug == null) View.GONE else View.VISIBLE)
    views.setViewVisibility(R.id.radarLabel, if (bug == null || compact) View.GONE else View.VISIBLE)
    views.setViewVisibility(R.id.radarQueueCount, if (stackCount > 1) View.VISIBLE else View.GONE)
    if (stackCount > 1) {
      views.setTextViewText(R.id.radarQueueCount, "x$stackCount")
    }
    views.setViewVisibility(R.id.radarRequestIcon, View.GONE)
    views.setViewVisibility(R.id.radarRequestBadges, View.GONE)
    views.setViewVisibility(R.id.radarTradeBadge, View.GONE)
    views.setViewVisibility(R.id.radarDuelBadge, View.GONE)
    val auraRes = bug?.let { rarityAuraRes(it.rarity) }
    views.setViewVisibility(R.id.radarRarityAura, if (auraRes == null) View.GONE else View.VISIBLE)
    if (auraRes != null) {
      views.setImageViewResource(R.id.radarRarityAura, auraRes)
    }
    if (bug != null) {
      views.setImageViewResource(R.id.radarBugImage, bug.imageRes)
      views.setTextViewText(R.id.radarBugName, bug.name)
    }

    val flags = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
    } else {
      PendingIntent.FLAG_UPDATE_CURRENT
    }
    val pendingIntent = if (bug == null) {
      val intent = Intent(context, MainActivity::class.java).apply {
        this.flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
      }
      PendingIntent.getActivity(context, widgetId, intent, flags)
    } else {
      val intent = Intent(context, BugRadarWidgetProvider::class.java).apply { action = actionOpenBug }
      PendingIntent.getBroadcast(context, openRequestCode + widgetId, intent, flags)
    }
    views.setOnClickPendingIntent(R.id.widgetRoot, pendingIntent)
    manager.updateAppWidget(widgetId, views)
  }

  private fun updateAllWidgets(context: Context) {
    val manager = AppWidgetManager.getInstance(context)
    val widgetIds = manager.getAppWidgetIds(ComponentName(context, BugRadarWidgetProvider::class.java))
    val bugs = activeRadarBugs(context)
    for (widgetId in widgetIds) {
      updateWidget(context, manager, widgetId, bugs.firstOrNull(), bugs.size)
    }
  }

  private fun isCompactWidget(options: Bundle): Boolean {
    val minWidth = options.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_WIDTH, 0)
    val minHeight = options.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_HEIGHT, 0)
    return minWidth in 1..109 || minHeight in 1..109
  }

  private fun scheduleNextSignal(context: Context) {
    val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
    val intent = Intent(context, BugRadarWidgetProvider::class.java).apply { action = actionSignal }
    val flags = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
    } else {
      PendingIntent.FLAG_UPDATE_CURRENT
    }
    val pendingIntent = PendingIntent.getBroadcast(context, signalRequestCode, intent, flags)
    val triggerAt = nextRollTime(context)
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
      alarmManager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAt, pendingIntent)
    } else {
      alarmManager.set(AlarmManager.RTC_WAKEUP, triggerAt, pendingIntent)
    }
  }

  private fun nextRollTime(context: Context): Long {
    val prefs = context.getSharedPreferences(prefsName, Context.MODE_PRIVATE)
    val now = Calendar.getInstance()
    val today = dayId(now)
    val count = if (prefs.getInt(prefDay, -1) == today) prefs.getInt(prefCount, 0) else 0
    val earliest = now.clone() as Calendar
    if (count >= dailySignalCount) {
      earliest.add(Calendar.DAY_OF_YEAR, 1)
      earliest.set(Calendar.HOUR_OF_DAY, 0)
      earliest.set(Calendar.MINUTE, 0)
    } else {
      earliest.add(Calendar.MINUTE, Random.nextInt(minRollMinutes, maxRollMinutes + 1))
    }
    earliest.set(Calendar.SECOND, 0)
    earliest.set(Calendar.MILLISECOND, 0)
    return nextRollWindowTime(earliest)
  }

  private fun nextRollWindowTime(from: Calendar): Long {
    val day = from.clone() as Calendar
    day.set(Calendar.HOUR_OF_DAY, 0)
    day.set(Calendar.MINUTE, 0)
    day.set(Calendar.SECOND, 0)
    day.set(Calendar.MILLISECOND, 0)

    repeat(signalLookaheadDays) {
      val windows = rollWindows(day)
        .mapNotNull { windowBounds(from, day, it.first, it.second) }
      if (windows.isNotEmpty()) {
        val window = windows.random()
        return Random.nextLong(window.first, window.second)
      }
      day.add(Calendar.DAY_OF_YEAR, 1)
    }

    val fallback = from.clone() as Calendar
    fallback.add(Calendar.MINUTE, minRollMinutes)
    return fallback.timeInMillis
  }

  private fun rollWindows(day: Calendar): List<Pair<Int, Int>> {
    if (!isWorkday(day)) return listOf(weekendStartHour to eveningEndHour)
    return listOf(workdayStartHour to workdayEndHour, workdayEndHour to eveningEndHour)
  }

  private fun windowBounds(from: Calendar, day: Calendar, startHour: Int, endHour: Int): Pair<Long, Long>? {
    val start = day.clone() as Calendar
    start.set(Calendar.HOUR_OF_DAY, startHour)
    val end = day.clone() as Calendar
    end.set(Calendar.HOUR_OF_DAY, endHour)
    val startMillis = maxOf(from.timeInMillis, start.timeInMillis)
    return if (startMillis < end.timeInMillis) startMillis to end.timeInMillis else null
  }

  private fun shouldSpawnOnRoll(context: Context, now: Calendar): Boolean {
    val prefs = context.getSharedPreferences(prefsName, Context.MODE_PRIVATE)
    val today = dayId(now)
    val count = if (prefs.getInt(prefDay, -1) == today) prefs.getInt(prefCount, 0) else 0
    if (count >= dailySignalCount) return false

    val lastSignalAt = prefs.getLong(prefLastSignalAt, 0L)
    if (lastSignalAt > 0L && now.timeInMillis - lastSignalAt < minMinutesBetweenSignals * 60_000L) return false

    val chance = rollChancePercent(now)
    return chance > 0 && Random.nextInt(100) < chance
  }

  private fun rollChancePercent(now: Calendar): Int {
    val hour = now.get(Calendar.HOUR_OF_DAY)
    if (!isWorkday(now)) return if (hour in weekendStartHour until eveningEndHour) weekendRollChancePercent else 0
    return when (hour) {
      in workdayStartHour until workdayEndHour -> officeRollChancePercent
      in workdayEndHour until eveningEndHour -> eveningRollChancePercent
      else -> 0
    }
  }

  private fun activeRadarBugs(context: Context): List<RadarBug> {
    return readActiveRadarBugIds(context).mapNotNull { findRadarBug(it) }
  }

  private fun appendActiveRadarBugs(context: Context, bugIds: List<String>): List<RadarBug> {
    val nextIds = writeActiveRadarBugIds(context, readActiveRadarBugIds(context) + bugIds)
    updateAllWidgets(context)
    return nextIds.mapNotNull { findRadarBug(it) }
  }

  private fun popActiveRadarBug(context: Context): List<RadarBug> {
    val nextIds = writeActiveRadarBugIds(context, readActiveRadarBugIds(context).drop(1))
    return nextIds.mapNotNull { findRadarBug(it) }
  }

  private fun noteSignal(context: Context, now: Calendar) {
    val prefs = context.getSharedPreferences(prefsName, Context.MODE_PRIVATE)
    val today = dayId(now)
    val currentCount = if (prefs.getInt(prefDay, -1) == today) prefs.getInt(prefCount, 0) else 0
    prefs.edit()
      .putInt(prefDay, today)
      .putInt(prefCount, currentCount + 1)
      .putLong(prefLastSignalAt, now.timeInMillis)
      .apply()
  }

  private fun dayId(calendar: Calendar): Int {
    return calendar.get(Calendar.YEAR) * 1000 + calendar.get(Calendar.DAY_OF_YEAR)
  }

  private fun isWorkday(calendar: Calendar): Boolean {
    val day = calendar.get(Calendar.DAY_OF_WEEK)
    return day != Calendar.SATURDAY && day != Calendar.SUNDAY
  }

  private fun pickRadarBug(): RadarBug {
    val rarity = pickRarity()
    val candidates = radarBugs.filter { it.rarity == rarity }
    return candidates.randomOrNull() ?: radarBugs.random()
  }

  private fun findRadarBug(id: String): RadarBug? {
    return radarBugs.firstOrNull { it.id == id }
  }

  private fun rarityAuraRes(rarity: String): Int? {
    return when (rarity) {
      "Episch" -> R.drawable.bug_radar_aura_epic_art
      "Legendarisch" -> R.drawable.bug_radar_aura_legendary_art
      else -> null
    }
  }

  private fun pickRarity(): String {
    val roll = Random.nextInt(100)
    return when {
      roll < 71 -> "Gewoon"
      roll < 95 -> "Zeldzaam"
      roll < 99 -> "Episch"
      else -> "Legendarisch"
    }
  }

  private data class RadarBug(val id: String, val name: String, val rarity: String, val imageRes: Int)

  companion object {
    private const val actionOpenBug = "nl.cimpro.bugbaas.action.OPEN_BUG_RADAR_SIGNAL"
    private const val actionSignal = "nl.cimpro.bugbaas.action.BUG_RADAR_SIGNAL"
    private const val dailySignalCount = 3
    private const val eveningEndHour = 22
    private const val eveningRollChancePercent = 25
    private const val maxRollMinutes = 120
    private const val minMinutesBetweenSignals = 180
    private const val minRollMinutes = 70
    private const val officeRollChancePercent = 55
    private const val openRequestCode = 5200
    private const val prefsName = "bug_radar_widget"
    private const val prefActiveBugId = "active_bug_id"
    private const val prefActiveBugIds = "active_bug_ids"
    private const val activeBugIdSeparator = "|"
    private const val maxActiveRadarBugs = 5
    private const val prefCount = "signal_count"
    private const val prefDay = "signal_day"
    private const val prefLastSignalAt = "last_signal_at"
    private const val prefTradeRequestCount = "trade_request_count"
    private const val prefDuelRequestCount = "duel_request_count"
    private const val signalLookaheadDays = 14
    private const val signalRequestCode = 4242
    private const val weekendRollChancePercent = 35
    private const val weekendStartHour = 10
    private const val workdayEndHour = 17
    private const val workdayStartHour = 9

    fun enqueueRadarBugs(context: Context, bugIds: List<String>): Int {
      val before = readActiveRadarBugIds(context)
      val validBugIds = bugIds.filter { id -> radarBugs.any { it.id == id } }
      val after = writeActiveRadarBugIds(context, before + validBugIds)
      BugRadarWidgetProvider().updateAllWidgets(context)
      return maxOf(0, after.size - before.size)
    }

    fun activeRadarBugIds(context: Context): List<String> {
      return readActiveRadarBugIds(context)
    }

    fun claimActiveRadarBugs(context: Context): List<String> {
      val bugIds = readActiveRadarBugIds(context)
      if (bugIds.isEmpty()) return emptyList()
      writeActiveRadarBugIds(context, emptyList())
      BugRadarWidgetProvider().updateAllWidgets(context)
      return bugIds
    }

    fun setRequestCounts(context: Context, tradeCount: Int, duelCount: Int) {
      context.getSharedPreferences(prefsName, Context.MODE_PRIVATE)
        .edit()
        .putInt(prefTradeRequestCount, maxOf(0, tradeCount))
        .putInt(prefDuelRequestCount, maxOf(0, duelCount))
        .apply()
      BugRadarWidgetProvider().updateAllWidgets(context)
    }

    fun pickRandomRadarBugIds(count: Int): List<String> {
      return List(maxOf(0, count)) { pickCompanionRadarBug().id }
    }

    private fun pickCompanionRadarBug(): RadarBug {
      val rarity = pickCompanionRarity()
      val candidates = radarBugs.filter { it.rarity == rarity }
      return candidates.randomOrNull() ?: radarBugs.random()
    }

    private fun pickCompanionRarity(): String {
      val roll = Random.nextInt(100)
      return when {
        roll < 71 -> "Gewoon"
        roll < 95 -> "Zeldzaam"
        roll < 99 -> "Episch"
        else -> "Legendarisch"
      }
    }

    private fun readActiveRadarBugIds(context: Context): List<String> {
      val prefs = context.getSharedPreferences(prefsName, Context.MODE_PRIVATE)
      val stacked = prefs.getString(prefActiveBugIds, null)
      val ids = if (!stacked.isNullOrBlank()) {
        stacked.split(activeBugIdSeparator)
      } else {
        listOfNotNull(prefs.getString(prefActiveBugId, null))
      }
      return ids
        .map { it.trim() }
        .filter { id -> id.isNotEmpty() && radarBugs.any { it.id == id } }
        .take(maxActiveRadarBugs)
    }

    private fun writeActiveRadarBugIds(context: Context, bugIds: List<String>): List<String> {
      val cleanIds = bugIds
        .filter { id -> radarBugs.any { it.id == id } }
        .take(maxActiveRadarBugs)
      context.getSharedPreferences(prefsName, Context.MODE_PRIVATE)
        .edit()
        .putString(prefActiveBugIds, cleanIds.joinToString(activeBugIdSeparator))
        .remove(prefActiveBugId)
        .apply()
      return cleanIds
    }

    private val radarBugs = listOf(
    RadarBug("zilvervisje", "Zilvervisje", "Gewoon", R.drawable.bugdex_zilvervisje),
    RadarBug("fruitvlieg", "Fruitvlieg", "Gewoon", R.drawable.bugdex_fruitvlieg),
    RadarBug("bladluis", "Bladluis", "Gewoon", R.drawable.bugdex_bladluis),
    RadarBug("mug", "Mug", "Gewoon", R.drawable.bugdex_mug),
    RadarBug("mot", "Mot", "Gewoon", R.drawable.bugdex_mot),
    RadarBug("mier", "Mier", "Gewoon", R.drawable.bugdex_mier),
    RadarBug("vlo", "Vlo", "Gewoon", R.drawable.bugdex_vlo),
    RadarBug("pissebed", "Pissebed", "Gewoon", R.drawable.bugdex_pissebed),
    RadarBug("stinkwants", "Stinkwants", "Zeldzaam", R.drawable.bugdex_stinkwants),
    RadarBug("snuitkever", "Snuitkever", "Zeldzaam", R.drawable.bugdex_snuitkever),
    RadarBug("lieveheersbeestje", "Lieveheersbeestje", "Zeldzaam", R.drawable.bugdex_lieveheersbeestje),
    RadarBug("kakkerlak", "Kakkerlak", "Gewoon", R.drawable.bugdex_kakkerlak),
    RadarBug("oorworm", "Oorworm", "Gewoon", R.drawable.bugdex_oorworm),
    RadarBug("boktor", "Boktor", "Episch", R.drawable.bugdex_boktor),
    RadarBug("tapijtkever", "Tapijtkever", "Zeldzaam", R.drawable.bugdex_tapijtkever),
    RadarBug("roofwants", "Roofwants", "Zeldzaam", R.drawable.bugdex_roofwants),
    RadarBug("duizendpoot", "Duizendpoot", "Zeldzaam", R.drawable.bugdex_duizendpoot),
    RadarBug("sprinkhaan", "Sprinkhaan", "Zeldzaam", R.drawable.bugdex_sprinkhaan),
    RadarBug("wesp", "Wesp", "Zeldzaam", R.drawable.bugdex_wesp),
    RadarBug("hoornaar", "Hoornaar", "Episch", R.drawable.bugdex_hoornaar),
    RadarBug("schorpioen", "Schorpioen", "Legendarisch", R.drawable.bugdex_schorpioen),
    RadarBug("termiet", "Termiet", "Gewoon", R.drawable.bugdex_termiet),
    RadarBug("mestkever", "Mestkever", "Zeldzaam", R.drawable.bugdex_mestkever),
    RadarBug("wandelende-tak", "Wandelende tak", "Zeldzaam", R.drawable.bugdex_wandelende_tak),
    RadarBug("vogelspin", "Vogelspin", "Episch", R.drawable.bugdex_vogelspin),
    RadarBug("reuzenkakkerlak", "Reuzenkakkerlak", "Episch", R.drawable.bugdex_reuzenkakkerlak),
    RadarBug("reuzen-duizendpoot", "Reuzenduizendpoot", "Legendarisch", R.drawable.bugdex_reuzen_duizendpoot),
    RadarBug("neushoornkever", "Neushoornkever", "Legendarisch", R.drawable.bugdex_neushoornkever),
    RadarBug("atlaskever", "Atlaskever", "Legendarisch", R.drawable.bugdex_atlaskever),
    RadarBug("herculeskever", "Herculeskever", "Legendarisch", R.drawable.bugdex_herculeskever),
    RadarBug("goliathkever", "Goliathkever", "Legendarisch", R.drawable.bugdex_goliathkever),
    RadarBug("motmug", "Motmug", "Gewoon", R.drawable.bugdex_motmug),
    RadarBug("langpootmug", "Langpootmug", "Gewoon", R.drawable.bugdex_langpootmug),
    RadarBug("faraomier", "Faraomier", "Gewoon", R.drawable.bugdex_faraomier),
    RadarBug("boekluis", "Boekluis", "Gewoon", R.drawable.bugdex_boekluis),
    RadarBug("stofluis", "Stofluis", "Gewoon", R.drawable.bugdex_stofluis),
    RadarBug("teek", "Teek", "Gewoon", R.drawable.bugdex_teek),
    RadarBug("fluweelmijt", "Fluweelmijt", "Gewoon", R.drawable.bugdex_fluweelmijt),
    RadarBug("schildwants", "Schildwants", "Zeldzaam", R.drawable.bugdex_schildwants),
    RadarBug("houtmier", "Houtmier", "Zeldzaam", R.drawable.bugdex_houtmier),
    RadarBug("kniptor", "Kniptor", "Zeldzaam", R.drawable.bugdex_kniptor),
    RadarBug("loopkever", "Loopkever", "Zeldzaam", R.drawable.bugdex_loopkever),
    RadarBug("waterkever", "Waterkever", "Zeldzaam", R.drawable.bugdex_waterkever),
    RadarBug("schrijvertje", "Schrijvertje", "Gewoon", R.drawable.bugdex_schrijvertje),
    RadarBug("schaatsenrijder", "Schaatsenrijder", "Zeldzaam", R.drawable.bugdex_schaatsenrijder),
    RadarBug("goudtor", "Goudtor", "Zeldzaam", R.drawable.bugdex_goudtor),
    RadarBug("tijgerkever", "Tijgerkever", "Zeldzaam", R.drawable.bugdex_tijgerkever),
    RadarBug("doodgraver", "Doodgraver", "Zeldzaam", R.drawable.bugdex_doodgraver),
    RadarBug("waterschorpioen", "Waterschorpioen", "Zeldzaam", R.drawable.bugdex_waterschorpioen),
    RadarBug("bidsprinkhaan", "Bidsprinkhaan", "Episch", R.drawable.bugdex_bidsprinkhaan),
    RadarBug("wandelend-blad", "Wandelend blad", "Episch", R.drawable.bugdex_wandelend_blad),
    RadarBug("wespspin", "Wespspin", "Zeldzaam", R.drawable.bugdex_wespspin),
    RadarBug("kruisspin", "Kruisspin", "Zeldzaam", R.drawable.bugdex_kruisspin),
    RadarBug("springspin", "Springspin", "Zeldzaam", R.drawable.bugdex_springspin),
    RadarBug("libel", "Libel", "Episch", R.drawable.bugdex_libel),
    RadarBug("waterjuffer", "Waterjuffer", "Episch", R.drawable.bugdex_waterjuffer),
    RadarBug("gaasvlieg", "Gaasvlieg", "Episch", R.drawable.bugdex_gaasvlieg),
    RadarBug("doodshoofdvlinder", "Doodshoofdvlinder", "Episch", R.drawable.bugdex_doodshoofdvlinder),
    RadarBug("kolibrievlinder", "Kolibrievlinder", "Episch", R.drawable.bugdex_kolibrievlinder),
    RadarBug("koninginnenpage", "Koninginnenpage", "Episch", R.drawable.bugdex_koninginnenpage),
    RadarBug("atalanta", "Atalanta", "Episch", R.drawable.bugdex_atalanta),
    RadarBug("dagpauwoog", "Dagpauwoog", "Episch", R.drawable.bugdex_dagpauwoog),
    RadarBug("eikenprocessierups", "Eikenprocessierups", "Zeldzaam", R.drawable.bugdex_eikenprocessierups),
    RadarBug("pijlstaartrups", "Pijlstaartrups", "Episch", R.drawable.bugdex_pijlstaartrups),
    RadarBug("cicade", "Cicade", "Zeldzaam", R.drawable.bugdex_cicade),
    RadarBug("schuimcicade", "Schuimcicade", "Gewoon", R.drawable.bugdex_schuimcicade),
    RadarBug("vliegend-hert", "Vliegend hert", "Legendarisch", R.drawable.bugdex_vliegend_hert),
    RadarBug("juweelkever", "Juweelkever", "Episch", R.drawable.bugdex_juweelkever),
    RadarBug("orchidee-bidsprinkhaan", "Orchidee-bidsprinkhaan", "Legendarisch", R.drawable.bugdex_orchidee_bidsprinkhaan),
    RadarBug("pauwspin", "Pauwspin", "Episch", R.drawable.bugdex_pauwspin),
    RadarBug("juweelwesp", "Juweelwesp", "Episch", R.drawable.bugdex_juweelwesp),
    RadarBug("goudschildkever", "Goudschildkever", "Episch", R.drawable.bugdex_goudschildkever),
    RadarBug("harlekijnwants", "Harlekijnwants", "Episch", R.drawable.bugdex_harlekijnwants),
    RadarBug("lantaarnvlieg", "Lantaarnvlieg", "Episch", R.drawable.bugdex_lantaarnvlieg),
    RadarBug("vioolspin", "Vioolspin", "Episch", R.drawable.bugdex_vioolspin),
    RadarBug("gespikkelde-houtvlinder", "Gespikkelde houtvlinder", "Episch", R.drawable.bugdex_gespikkelde_houtvlinder),
    RadarBug("zebra-springspin", "Zebra-springspin", "Episch", R.drawable.bugdex_zebra_springspin),
    RadarBug("smaragdlibel", "Smaragdlibel", "Legendarisch", R.drawable.bugdex_smaragdlibel),
    RadarBug("glasvleugelvlinder", "Glasvleugelvlinder", "Episch", R.drawable.bugdex_glasvleugelvlinder),
    RadarBug("komeetmot", "Komeetmot", "Episch", R.drawable.bugdex_komeetmot),
    RadarBug("maanmot", "Maanmot", "Episch", R.drawable.bugdex_maanmot),
    RadarBug("atlasvlinder", "Atlasvlinder", "Legendarisch", R.drawable.bugdex_atlasvlinder),
    RadarBug("rozekever", "Rozekever", "Zeldzaam", R.drawable.bugdex_rozekever),
    RadarBug("kardinaalkever", "Kardinaalkever", "Episch", R.drawable.bugdex_kardinaalkever),
    RadarBug("vuurwants", "Vuurwants", "Zeldzaam", R.drawable.bugdex_vuurwants),
    RadarBug("sabelsprinkhaan", "Sabelsprinkhaan", "Episch", R.drawable.bugdex_sabelsprinkhaan),
    RadarBug("mierenleeuw", "Mierenleeuw", "Gewoon", R.drawable.bugdex_mierenleeuw),
    RadarBug("dobsonvlieg", "Dobsonvlieg", "Legendarisch", R.drawable.bugdex_dobsonvlieg),
    RadarBug("helikopterjuffer", "Helikopterjuffer", "Episch", R.drawable.bugdex_helikopterjuffer),
    RadarBug("spookinsect", "Spookinsect", "Legendarisch", R.drawable.bugdex_spookinsect),
    RadarBug("bladpootwants", "Bladpootwants", "Episch", R.drawable.bugdex_bladpootwants),
    RadarBug("assassin-bug", "Assassin bug", "Legendarisch", R.drawable.bugdex_assassin_bug),
    RadarBug("tijgermug", "Tijgermug", "Episch", R.drawable.bugdex_tijgermug),
    RadarBug("dolksteekwesp", "Dolksteekwesp", "Legendarisch", R.drawable.bugdex_dolksteekwesp),
    RadarBug("roofvlieg", "Roofvlieg", "Episch", R.drawable.bugdex_roofvlieg),
    RadarBug("kameelhalsvlieg", "Kameelhalsvlieg", "Episch", R.drawable.bugdex_kameelhalsvlieg),
    RadarBug("zweefvlieg", "Zweefvlieg", "Gewoon", R.drawable.bugdex_zweefvlieg),
    RadarBug("goudwesp", "Goudwesp", "Episch", R.drawable.bugdex_goudwesp),
    RadarBug("sluipwesp", "Sluipwesp", "Zeldzaam", R.drawable.bugdex_sluipwesp),
    RadarBug("fluweelmier", "Fluweelmier", "Episch", R.drawable.bugdex_fluweelmier),
    RadarBug("reuzenwaterwants", "Reuzenwaterwants", "Legendarisch", R.drawable.bugdex_reuzenwaterwants),
    RadarBug("zweepschorpioen", "Zweepschorpioen", "Legendarisch", R.drawable.bugdex_zweepschorpioen),
    RadarBug("azuren-waterjuffer", "Azuren waterjuffer", "Episch", R.drawable.bugdex_azuren_waterjuffer),
    RadarBug("rouwmantelvlinder", "Rouwmantelvlinder", "Legendarisch", R.drawable.bugdex_rouwmantelvlinder),
    RadarBug("keizersmantel", "Keizersmantel", "Legendarisch", R.drawable.bugdex_keizersmantel),
    RadarBug("gouden-tor", "Gouden tor", "Zeldzaam", R.drawable.bugdex_gouden_tor),
    RadarBug("soldaatje", "Soldaatje", "Zeldzaam", R.drawable.bugdex_soldaatje),
    RadarBug("doodgraverkever", "Doodgraverkever", "Episch", R.drawable.bugdex_doodgraverkever),
    RadarBug("olifantskever", "Olifantskever", "Legendarisch", R.drawable.bugdex_olifantskever),
    RadarBug("regenboogmestkever", "Regenboogmestkever", "Legendarisch", R.drawable.bugdex_regenboogmestkever),
    RadarBug("titanus-kever", "Titanus-kever", "Legendarisch", R.drawable.bugdex_titanus_kever),
    RadarBug("langsprietboktor", "Langsprietboktor", "Episch", R.drawable.bugdex_langsprietboktor),
    RadarBug("schildpadkever", "Schildpadkever", "Episch", R.drawable.bugdex_schildpadkever),
    RadarBug("vuurkever", "Vuurkever", "Zeldzaam", R.drawable.bugdex_vuurkever),
    RadarBug("blauwe-ertsbij", "Blauwe ertsbij", "Legendarisch", R.drawable.bugdex_blauwe_ertsbij),
    RadarBug("wespboktor", "Wespboktor", "Episch", R.drawable.bugdex_wespboktor),
    RadarBug("groene-zandloopkever", "Groene zandloopkever", "Legendarisch", R.drawable.bugdex_groene_zandloopkever)
    )
  }
}
