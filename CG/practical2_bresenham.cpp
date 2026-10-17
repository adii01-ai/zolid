// Practical No. 02 - Bresenham's Line and Circle Drawing Algorithm
// Name: Aditya Nitin Gaikwad | PRN: 202602040025 | Div: F | Batch: F2 | Roll No: 431

#include <graphics.h>
#include <iostream>
#include <cstdlib>
using namespace std;

// Bresenham's line algorithm (works for all slopes and directions)
void bresenhamLine(int x1, int y1, int x2, int y2)
{
    int dx = abs(x2 - x1);
    int dy = abs(y2 - y1);
    int sx = (x1 < x2) ? 1 : -1;
    int sy = (y1 < y2) ? 1 : -1;
    int err = dx - dy;

    while (true)
    {
        putpixel(x1, y1, WHITE);
        if (x1 == x2 && y1 == y2)
            break;
        int e2 = 2 * err;
        if (e2 > -dy) { err -= dy; x1 += sx; }
        if (e2 <  dx) { err += dx; y1 += sy; }
    }
}

// Plot a point in all eight octants
void plot8(int xc, int yc, int x, int y)
{
    putpixel(xc + x, yc + y, YELLOW);
    putpixel(xc - x, yc + y, YELLOW);
    putpixel(xc + x, yc - y, YELLOW);
    putpixel(xc - x, yc - y, YELLOW);
    putpixel(xc + y, yc + x, YELLOW);
    putpixel(xc - y, yc + x, YELLOW);
    putpixel(xc + y, yc - x, YELLOW);
    putpixel(xc - y, yc - x, YELLOW);
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

int main()
{
    int x1, y1, x2, y2, xc, yc, r;

    cout << "Bresenham's Line Drawing\n";
    cout << "Enter x1 y1: ";  cin >> x1 >> y1;
    cout << "Enter x2 y2: ";  cin >> x2 >> y2;

    cout << "\nBresenham's Circle Drawing\n";
    cout << "Enter centre xc yc: ";  cin >> xc >> yc;
    cout << "Enter radius r: ";      cin >> r;

    int gd = DETECT, gm;
    initgraph(&gd, &gm, (char*)"");

    bresenhamLine(x1, y1, x2, y2);
    bresenhamCircle(xc, yc, r);

    outtextxy(10, 10, (char*)"Bresenham Line (white) and Circle (yellow)");

    getch();
    closegraph();
    return 0;
}
