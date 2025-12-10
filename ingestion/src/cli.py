"""CLI for the HyperTrending ingestion service."""

import click
import logging
from rich.console import Console
from rich.table import Table
from rich.panel import Panel
from rich.progress import Progress, SpinnerColumn, TextColumn
from rich import print as rprint

from .config import get_settings, SourceCode, REGIONS
from .fetchers import GoogleTrendsFetcher
from .storage import SupabaseStorage
from .runners import MissionRunner
from .utils import setup_logging

console = Console()
logger = logging.getLogger(__name__)


@click.group()
@click.option("-v", "--verbose", is_flag=True, help="Enable verbose output")
@click.pass_context
def main(ctx, verbose: bool):
    """HyperTrending Ingestion CLI - Fetch and store trend data."""
    ctx.ensure_object(dict)
    ctx.obj["verbose"] = verbose
    setup_logging(verbose)


# -----------------------------------------------------------------------------
# Scan Commands
# -----------------------------------------------------------------------------


@main.command()
@click.option("--region", "-r", default="US", help="Region code (e.g., US, GB, CA)")
@click.option("--limit", "-l", default=20, help="Number of results to fetch")
@click.pass_context
def scan(ctx, region: str, limit: int):
    """Fetch currently trending keywords (quick scan, no DB storage)."""
    console.print(f"\n[bold cyan]Scanning trending keywords in {region}...[/bold cyan]\n")

    with Progress(
        SpinnerColumn(),
        TextColumn("[progress.description]{task.description}"),
        console=console,
    ) as progress:
        task = progress.add_task("Fetching from Google Trends...", total=None)

        try:
            fetcher = GoogleTrendsFetcher()
            results = fetcher.fetch_trending(region=region, limit=limit)
            progress.update(task, completed=True)

            if not results:
                console.print("[yellow]No trending keywords found.[/yellow]")
                return

            # Display results in a table
            table = Table(title=f"Trending in {region}", show_header=True, header_style="bold magenta")
            table.add_column("#", style="dim", width=4)
            table.add_column("Keyword", style="cyan")
            table.add_column("Interest", justify="right")
            table.add_column("Trend Score", justify="right", style="green")

            for i, trend in enumerate(results, 1):
                score_style = "green" if trend.trend_score > 50 else "yellow" if trend.trend_score > 0 else "red"
                table.add_row(
                    str(i),
                    trend.keyword,
                    str(trend.current_interest),
                    f"[{score_style}]{trend.trend_score:+.1f}%[/{score_style}]",
                )

            console.print(table)
            console.print(f"\n[dim]Found {len(results)} trending keywords[/dim]")

        except Exception as e:
            progress.update(task, completed=True)
            console.print(f"[red]Error: {e}[/red]")
            raise click.Abort()


@main.command()
@click.argument("keywords", nargs=-1, required=True)
@click.option("--region", "-r", default="US", help="Region code")
@click.option("--timeframe", "-t", default="7d", help="Timeframe (1h, 4h, 24h, 7d, 30d)")
@click.pass_context
def analyze(ctx, keywords: tuple, region: str, timeframe: str):
    """Analyze specific keywords (interest over time + related queries)."""
    keywords_list = list(keywords)
    console.print(f"\n[bold cyan]Analyzing {len(keywords_list)} keywords in {region}...[/bold cyan]\n")

    runner = MissionRunner()

    with Progress(
        SpinnerColumn(),
        TextColumn("[progress.description]{task.description}"),
        console=console,
    ) as progress:
        task = progress.add_task("Fetching data...", total=None)

        try:
            results = runner.run_keyword_analysis(
                keywords=keywords_list,
                region=region,
                timeframe=timeframe,
            )
            progress.update(task, completed=True)

            if not results:
                console.print("[yellow]No data found for the specified keywords.[/yellow]")
                return

            # Display results
            for keyword, data in results.items():
                panel_content = []
                panel_content.append(f"[bold]Current Interest:[/bold] {data.current_interest}")
                panel_content.append(f"[bold]Baseline Interest:[/bold] {data.baseline_interest}")

                score_style = "green" if data.trend_score > 50 else "yellow" if data.trend_score > 0 else "red"
                panel_content.append(f"[bold]Trend Score:[/bold] [{score_style}]{data.trend_score:+.1f}%[/{score_style}]")

                if data.timeseries:
                    # Simple sparkline
                    values = [p.value for p in data.timeseries[-20:]]
                    sparkline = " ".join(["▁▂▃▄▅▆▇█"[min(7, v // 13)] for v in values])
                    panel_content.append(f"[bold]Trend:[/bold] {sparkline}")

                if data.related_queries:
                    panel_content.append(f"\n[bold]Related:[/bold] {', '.join(data.related_queries[:5])}")

                if data.rising_queries:
                    rising = [f"{q['query']} ({q['value']})" for q in data.rising_queries[:3]]
                    panel_content.append(f"[bold]Rising:[/bold] {', '.join(rising)}")

                console.print(Panel("\n".join(panel_content), title=f"[cyan]{keyword}[/cyan]", expand=False))

        except Exception as e:
            progress.update(task, completed=True)
            console.print(f"[red]Error: {e}[/red]")
            raise click.Abort()


# -----------------------------------------------------------------------------
# Mission Commands
# -----------------------------------------------------------------------------


@main.command()
@click.argument("mission_id")
@click.pass_context
def run(ctx, mission_id: str):
    """Run a mission by ID."""
    console.print(f"\n[bold cyan]Running mission {mission_id}...[/bold cyan]\n")

    runner = MissionRunner()

    with Progress(
        SpinnerColumn(),
        TextColumn("[progress.description]{task.description}"),
        console=console,
    ) as progress:
        task = progress.add_task("Executing mission...", total=None)

        success, stats = runner.run_mission(mission_id)
        progress.update(task, completed=True)

        if success:
            console.print(Panel(
                f"[green]Mission completed successfully![/green]\n\n"
                f"Keywords scanned: {stats.keywords_scanned}\n"
                f"Keywords matched: {stats.keywords_matched}\n"
                f"Regions scanned: {stats.regions_scanned}\n"
                f"API calls: {stats.api_calls_made}\n"
                f"Duration: {stats.duration_ms}ms",
                title="Mission Complete",
            ))
        else:
            console.print(Panel(
                f"[red]Mission failed![/red]\n\n"
                f"Errors: {', '.join(stats.errors)}",
                title="Mission Failed",
            ))


@main.command()
@click.pass_context
def missions(ctx):
    """List all active missions."""
    console.print("\n[bold cyan]Active Missions[/bold cyan]\n")

    storage = SupabaseStorage()
    mission_list = storage.get_active_missions()

    if not mission_list:
        console.print("[yellow]No active missions found.[/yellow]")
        return

    table = Table(show_header=True, header_style="bold magenta")
    table.add_column("ID", style="dim")
    table.add_column("Name", style="cyan")
    table.add_column("Status")
    table.add_column("Total Runs", justify="right")
    table.add_column("Last Run")

    for mission in mission_list:
        table.add_row(
            mission["id"][:8] + "...",
            mission["name"],
            f"[green]{mission['status']}[/green]",
            str(mission["total_runs"]),
            mission.get("last_run_at", "Never")[:19] if mission.get("last_run_at") else "Never",
        )

    console.print(table)


# -----------------------------------------------------------------------------
# Database Commands
# -----------------------------------------------------------------------------


@main.command()
@click.pass_context
def sources(ctx):
    """List all data sources."""
    console.print("\n[bold cyan]Data Sources[/bold cyan]\n")

    storage = SupabaseStorage()
    source_list = storage.get_all_sources()

    if not source_list:
        console.print("[yellow]No sources found. Have you deployed the schema?[/yellow]")
        return

    table = Table(show_header=True, header_style="bold magenta")
    table.add_column("Code", style="cyan")
    table.add_column("Name")
    table.add_column("Active")
    table.add_column("Description", max_width=40)

    for source in source_list:
        status = "[green]Yes[/green]" if source["is_active"] else "[red]No[/red]"
        table.add_row(
            source["code"],
            source["name"],
            status,
            source.get("description", "")[:40] + "..." if source.get("description") else "",
        )

    console.print(table)


@main.command()
@click.argument("keyword")
@click.option("--language", "-l", default="en", help="Language code")
@click.pass_context
def add_keyword(ctx, keyword: str, language: str):
    """Add a keyword to track."""
    storage = SupabaseStorage()

    keyword_id = storage.upsert_keyword(keyword=keyword, language=language)

    if keyword_id:
        console.print(f"[green]Keyword added: {keyword} (ID: {keyword_id})[/green]")
    else:
        console.print(f"[red]Failed to add keyword: {keyword}[/red]")


@main.command()
@click.argument("query")
@click.option("--limit", "-l", default=20, help="Max results")
@click.pass_context
def search(ctx, query: str, limit: int):
    """Search keywords in the database."""
    storage = SupabaseStorage()

    results = storage.search_keywords(query, limit)

    if not results:
        console.print(f"[yellow]No keywords found matching '{query}'[/yellow]")
        return

    table = Table(title=f"Search: {query}", show_header=True, header_style="bold magenta")
    table.add_column("Keyword", style="cyan")
    table.add_column("Category")
    table.add_column("Searches", justify="right")
    table.add_column("Last Seen")

    for kw in results:
        table.add_row(
            kw["keyword"],
            kw.get("category", "-"),
            str(kw.get("total_searches", 0)),
            kw.get("last_seen_at", "")[:10] if kw.get("last_seen_at") else "-",
        )

    console.print(table)


# -----------------------------------------------------------------------------
# Ingest Commands
# -----------------------------------------------------------------------------


@main.command()
@click.option("--region", "-r", default="US", help="Region code")
@click.option("--limit", "-l", default=20, help="Number of keywords")
@click.option("--timeframe", "-t", default="7d", help="Timeframe for timeseries")
@click.pass_context
def ingest(ctx, region: str, limit: int, timeframe: str):
    """Fetch trending keywords and store in database."""
    console.print(f"\n[bold cyan]Ingesting trending data for {region}...[/bold cyan]\n")

    storage = SupabaseStorage()
    fetcher = GoogleTrendsFetcher()

    with Progress(
        SpinnerColumn(),
        TextColumn("[progress.description]{task.description}"),
        console=console,
    ) as progress:
        # Fetch trending
        task = progress.add_task("Fetching trending keywords...", total=None)
        trending = fetcher.fetch_trending(region=region, limit=limit)
        progress.update(task, completed=True)

        if not trending:
            console.print("[yellow]No trending keywords found.[/yellow]")
            return

        console.print(f"Found {len(trending)} trending keywords")

        # Fetch timeseries for top keywords
        task = progress.add_task("Fetching timeseries data...", total=None)
        top_keywords = [t.keyword for t in trending[:5]]
        timeseries_data = fetcher.fetch_interest_over_time(
            keywords=top_keywords,
            region=region,
            timeframe=timeframe,
        )

        # Merge timeseries into trending
        for trend in trending:
            if trend.keyword in timeseries_data:
                trend.timeseries = timeseries_data[trend.keyword].timeseries
                trend.calculate_from_timeseries()

        progress.update(task, completed=True)

        # Store in database
        task = progress.add_task("Storing in database...", total=None)
        stored = 0
        for trend in trending:
            keyword_id = storage.store_trend_data(trend)
            if keyword_id:
                stored += 1

        progress.update(task, completed=True)

        console.print(Panel(
            f"[green]Ingestion complete![/green]\n\n"
            f"Keywords fetched: {len(trending)}\n"
            f"Keywords stored: {stored}\n"
            f"Region: {region}\n"
            f"Timeframe: {timeframe}",
            title="Ingestion Summary",
        ))


# -----------------------------------------------------------------------------
# Info Commands
# -----------------------------------------------------------------------------


@main.command()
@click.pass_context
def regions(ctx):
    """List available region codes."""
    console.print("\n[bold cyan]Available Regions[/bold cyan]\n")

    table = Table(show_header=True, header_style="bold magenta")
    table.add_column("Code", style="cyan")
    table.add_column("Description")

    region_names = {
        "GLOBAL": "Worldwide",
        "US": "United States",
        "GB": "United Kingdom",
        "CA": "Canada",
        "AU": "Australia",
        "DE": "Germany",
        "FR": "France",
        "JP": "Japan",
        "IN": "India",
        "BR": "Brazil",
        "MX": "Mexico",
    }

    for code, geo_code in REGIONS.items():
        table.add_row(code, region_names.get(code, code))

    console.print(table)


@main.command()
@click.pass_context
def status(ctx):
    """Check connection status to Supabase."""
    console.print("\n[bold cyan]Connection Status[/bold cyan]\n")

    settings = get_settings()
    storage = SupabaseStorage()

    # Check Supabase connection
    try:
        sources = storage.get_all_sources()
        console.print(f"[green]Supabase:[/green] Connected")
        console.print(f"  URL: {settings.supabase_url}")
        console.print(f"  Sources: {len(sources)} configured")
    except Exception as e:
        console.print(f"[red]Supabase:[/red] Connection failed - {e}")

    # Check pytrends
    try:
        fetcher = GoogleTrendsFetcher()
        suggestions = fetcher.fetch_suggestions("test")
        console.print(f"[green]Google Trends:[/green] API accessible")
    except Exception as e:
        console.print(f"[yellow]Google Trends:[/yellow] {e}")


if __name__ == "__main__":
    main()
