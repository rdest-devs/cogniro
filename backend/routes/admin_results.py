"""Admin results browser endpoints."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.concurrency import run_in_threadpool

from security.admin_auth import require_admin
from services.results import (
    delete_result_day,
    delete_result_file,
    list_result_dates,
    list_results_in_day,
    read_result_file,
)
from services.storage import get_storage

router = APIRouter(
    prefix="/admin/results",
    tags=["admin-results"],
    dependencies=[Depends(require_admin)],
)


@router.get("")
async def results_list_dates(request: Request) -> list[str]:
    return await run_in_threadpool(list_result_dates, get_storage(request.app))


@router.get("/{date}")
async def results_list_in_day(request: Request, date: str) -> list[dict]:
    metas = await run_in_threadpool(list_results_in_day, get_storage(request.app), date)
    return [m.__dict__ for m in metas]


@router.get("/{date}/{filename}")
async def results_read_file(request: Request, date: str, filename: str) -> dict:
    try:
        return await run_in_threadpool(
            read_result_file, get_storage(request.app), date, filename
        )
    except FileNotFoundError:
        raise HTTPException(status_code=404) from None


@router.delete("/{date}/{filename}", status_code=204)
async def results_delete_file(request: Request, date: str, filename: str) -> None:
    await run_in_threadpool(
        delete_result_file, get_storage(request.app), date, filename
    )


@router.delete("/{date}", status_code=204)
async def results_delete_day(request: Request, date: str) -> None:
    await run_in_threadpool(delete_result_day, get_storage(request.app), date)
