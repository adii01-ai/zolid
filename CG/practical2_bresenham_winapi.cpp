// Practical No. 02 - Bresenham's Line and Circle Drawing Algorithm
// Name: Aditya Nitin Gaikwad | PRN: 202602040025 | Div: F | Batch: F2 | Roll No: 431
// Uses only the Windows API (no graphics.h needed). Linker option: -lgdi32

#include <windows.h>
#include <iostream>
#include <cstdlib>
using namespace std;

int x1, y1_, x2, y2, xc, yc, r;   // y1 is a reserved name in <cmath>, so y1_ is used
HDC hdc;

void putpixel(int x, int y, COLORREF color)
{
    SetPixel(hdc, x, y, color);
}

// Bresenham's line algorithm (works for all slopes and directions)
void bresenhamLine(int xa, int ya, int xb, int yb)
{
    int dx = abs(xb - xa);
    int dy = abs(yb - ya);
    int sx = (xa < xb) ? 1 : -1;
    int sy = (ya < yb) ? 1 : -1;
    int err = dx - dy;

    while (true)
    {
        putpixel(xa, ya, RGB(255, 255, 255));
        if (xa == xb && ya == yb)
            break;
        int e2 = 2 * err;
        if (e2 > -dy) { err -= dy; xa += sx; }
        if (e2 <  dx) { err += dx; ya += sy; }
    }
}

// Plot a point in all eight octants
void plot8(int xc, int yc, int x, int y)
{
    COLORREF c = RGB(255, 255, 0);
    putpixel(xc + x, yc + y, c);
    putpixel(xc - x, yc + y, c);
    putpixel(xc + x, yc - y, c);
    putpixel(xc - x, yc - y, c);
    putpixel(xc + y, yc + x, c);
    putpixel(xc - y, yc + x, c);
    putpixel(xc + y, yc - x, c);
    putpixel(xc - y, yc - x, c);
}

// Bresenham's circle algorithm
void bresenhamCircle(int xc, int yc, int r)
{
    int x = 0, y = r;
    int d = 3 - 2 * r;

    while (x <= y)
    {
        plot8(xc, yc, x, y);
        if (d < 0)
            d = d + 4 * x + 6;
        else
        {
            d = d + 4 * (x - y) + 10;
            y--;
        }
        x++;
    }
}

LRESULT CALLBACK WndProc(HWND hwnd, UINT msg, WPARAM wParam, LPARAM lParam)
{
    if (msg == WM_PAINT)
    {
        PAINTSTRUCT ps;
        hdc = BeginPaint(hwnd, &ps);

        SetBkColor(hdc, RGB(0, 0, 0));
        SetTextColor(hdc, RGB(255, 255, 255));
        TextOutA(hdc, 10, 10, "Bresenham Line (white) and Circle (yellow)", 42);

        bresenhamLine(x1, y1_, x2, y2);
        bresenhamCircle(xc, yc, r);

        EndPaint(hwnd, &ps);
        return 0;
    }
    if (msg == WM_KEYDOWN || msg == WM_DESTROY)
    {
        PostQuitMessage(0);
        return 0;
    }
    return DefWindowProcA(hwnd, msg, wParam, lParam);
}

int main()
{
    cout << "Bresenham's Line Drawing\n";
    cout << "Enter x1 y1: ";  cin >> x1 >> y1_;
    cout << "Enter x2 y2: ";  cin >> x2 >> y2;

    cout << "\nBresenham's Circle Drawing\n";
    cout << "Enter centre xc yc: ";  cin >> xc >> yc;
    cout << "Enter radius r: ";      cin >> r;

    HINSTANCE hInst = GetModuleHandle(NULL);
    WNDCLASSA wc = {};
    wc.lpfnWndProc   = WndProc;
    wc.hInstance     = hInst;
    wc.hCursor       = LoadCursor(NULL, IDC_ARROW);
    wc.hbrBackground = (HBRUSH)GetStockObject(BLACK_BRUSH);
    wc.lpszClassName = "BresenhamWindow";
    RegisterClassA(&wc);

    HWND hwnd = CreateWindowA("BresenhamWindow", "Practical 2 - Bresenham",
                              WS_OVERLAPPEDWINDOW, CW_USEDEFAULT, CW_USEDEFAULT,
                              660, 500, NULL, NULL, hInst, NULL);
    ShowWindow(hwnd, SW_SHOW);
    UpdateWindow(hwnd);

    MSG msg;
    while (GetMessage(&msg, NULL, 0, 0) > 0)
    {
        TranslateMessage(&msg);
        DispatchMessage(&msg);
    }
    return 0;
}
