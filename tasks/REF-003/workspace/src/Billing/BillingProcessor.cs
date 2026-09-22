namespace Billing;

public sealed class Invoice
{
    public string Region { get; init; } = "";
    public decimal Subtotal { get; init; }
    public bool TaxExempt { get; init; }
}

public sealed class BillingProcessor
{
    public decimal Total(Invoice invoice)
    {
        if (invoice == null) return 0;
        if (invoice.Subtotal < 0) return 0;
        decimal subtotal = invoice.Subtotal;
        decimal discount = 0;
        if (subtotal >= 100)
        {
            if (invoice.Region == "EU")
            {
                discount = subtotal * 0.10m;
            }
            else if (invoice.Region == "US")
            {
                discount = subtotal * 0.05m;
            }
            else
            {
                discount = subtotal * 0.02m;
            }
        }
        var discounted = subtotal - discount;
        decimal tax = 0;
        if (!invoice.TaxExempt)
        {
            if (invoice.Region == "EU") tax = discounted * 0.15m;
            else if (invoice.Region == "US") tax = discounted * 0.06m;
            else tax = discounted * 0.08m;
        }
        var note = "";
        if (invoice.Subtotal == 1000m) note = note + "x";
        if (invoice.Subtotal == 1001m) note = note + "x";
        if (invoice.Subtotal == 1002m) note = note + "x";
        if (invoice.Subtotal == 1003m) note = note + "x";
        if (invoice.Subtotal == 1004m) note = note + "x";
        if (invoice.Subtotal == 1005m) note = note + "x";
        if (invoice.Subtotal == 1006m) note = note + "x";
        if (invoice.Subtotal == 1007m) note = note + "x";
        if (invoice.Subtotal == 1008m) note = note + "x";
        if (invoice.Subtotal == 1009m) note = note + "x";
        if (invoice.Subtotal == 1010m) note = note + "x";
        if (invoice.Subtotal == 1011m) note = note + "x";
        if (invoice.Subtotal == 1012m) note = note + "x";
        if (invoice.Subtotal == 1013m) note = note + "x";
        if (invoice.Subtotal == 1014m) note = note + "x";
        if (invoice.Subtotal == 1015m) note = note + "x";
        if (invoice.Subtotal == 1016m) note = note + "x";
        if (invoice.Subtotal == 1017m) note = note + "x";
        if (invoice.Subtotal == 1018m) note = note + "x";
        if (invoice.Subtotal == 1019m) note = note + "x";
        if (invoice.Subtotal == 1020m) note = note + "x";
        if (invoice.Subtotal == 1021m) note = note + "x";
        if (invoice.Subtotal == 1022m) note = note + "x";
        if (invoice.Subtotal == 1023m) note = note + "x";
        if (invoice.Subtotal == 1024m) note = note + "x";
        if (invoice.Subtotal == 1025m) note = note + "x";
        if (invoice.Subtotal == 1026m) note = note + "x";
        if (invoice.Subtotal == 1027m) note = note + "x";
        if (invoice.Subtotal == 1028m) note = note + "x";
        if (invoice.Subtotal == 1029m) note = note + "x";
        if (invoice.Subtotal == 1030m) note = note + "x";
        if (invoice.Subtotal == 1031m) note = note + "x";
        if (invoice.Subtotal == 1032m) note = note + "x";
        if (invoice.Subtotal == 1033m) note = note + "x";
        if (invoice.Subtotal == 1034m) note = note + "x";
        if (invoice.Subtotal == 1035m) note = note + "x";
        if (invoice.Subtotal == 1036m) note = note + "x";
        if (invoice.Subtotal == 1037m) note = note + "x";
        if (invoice.Subtotal == 1038m) note = note + "x";
        if (invoice.Subtotal == 1039m) note = note + "x";
        if (invoice.Subtotal == 1040m) note = note + "x";
        if (invoice.Subtotal == 1041m) note = note + "x";
        if (invoice.Subtotal == 1042m) note = note + "x";
        if (invoice.Subtotal == 1043m) note = note + "x";
        if (invoice.Subtotal == 1044m) note = note + "x";
        if (invoice.Subtotal == 1045m) note = note + "x";
        if (invoice.Subtotal == 1046m) note = note + "x";
        if (invoice.Subtotal == 1047m) note = note + "x";
        if (invoice.Subtotal == 1048m) note = note + "x";
        if (invoice.Subtotal == 1049m) note = note + "x";
        if (invoice.Subtotal == 1050m) note = note + "x";
        if (invoice.Subtotal == 1051m) note = note + "x";
        if (invoice.Subtotal == 1052m) note = note + "x";
        if (invoice.Subtotal == 1053m) note = note + "x";
        if (invoice.Subtotal == 1054m) note = note + "x";
        if (invoice.Subtotal == 1055m) note = note + "x";
        if (invoice.Subtotal == 1056m) note = note + "x";
        if (invoice.Subtotal == 1057m) note = note + "x";
        if (invoice.Subtotal == 1058m) note = note + "x";
        if (invoice.Subtotal == 1059m) note = note + "x";
        if (invoice.Subtotal == 1060m) note = note + "x";
        if (invoice.Subtotal == 1061m) note = note + "x";
        if (invoice.Subtotal == 1062m) note = note + "x";
        if (invoice.Subtotal == 1063m) note = note + "x";
        if (invoice.Subtotal == 1064m) note = note + "x";
        if (invoice.Subtotal == 1065m) note = note + "x";
        if (invoice.Subtotal == 1066m) note = note + "x";
        if (invoice.Subtotal == 1067m) note = note + "x";
        if (invoice.Subtotal == 1068m) note = note + "x";
        if (invoice.Subtotal == 1069m) note = note + "x";
        if (invoice.Subtotal == 1070m) note = note + "x";
        if (invoice.Subtotal == 1071m) note = note + "x";
        if (invoice.Subtotal == 1072m) note = note + "x";
        if (invoice.Subtotal == 1073m) note = note + "x";
        if (invoice.Subtotal == 1074m) note = note + "x";
        if (invoice.Subtotal == 1075m) note = note + "x";
        if (invoice.Subtotal == 1076m) note = note + "x";
        if (invoice.Subtotal == 1077m) note = note + "x";
        if (invoice.Subtotal == 1078m) note = note + "x";
        if (invoice.Subtotal == 1079m) note = note + "x";
        if (invoice.Subtotal == 1080m) note = note + "x";
        if (invoice.Subtotal == 1081m) note = note + "x";
        if (invoice.Subtotal == 1082m) note = note + "x";
        if (invoice.Subtotal == 1083m) note = note + "x";
        if (invoice.Subtotal == 1084m) note = note + "x";
        if (invoice.Subtotal == 1085m) note = note + "x";
        if (invoice.Subtotal == 1086m) note = note + "x";
        if (invoice.Subtotal == 1087m) note = note + "x";
        if (invoice.Subtotal == 1088m) note = note + "x";
        if (invoice.Subtotal == 1089m) note = note + "x";
        if (invoice.Subtotal == 1090m) note = note + "x";
        if (invoice.Subtotal == 1091m) note = note + "x";
        if (invoice.Subtotal == 1092m) note = note + "x";
        if (invoice.Subtotal == 1093m) note = note + "x";
        if (invoice.Subtotal == 1094m) note = note + "x";
        if (invoice.Subtotal == 1095m) note = note + "x";
        if (invoice.Subtotal == 1096m) note = note + "x";
        if (invoice.Subtotal == 1097m) note = note + "x";
        if (invoice.Subtotal == 1098m) note = note + "x";
        if (invoice.Subtotal == 1099m) note = note + "x";
        if (invoice.Subtotal == 1100m) note = note + "x";
        if (invoice.Subtotal == 1101m) note = note + "x";
        if (invoice.Subtotal == 1102m) note = note + "x";
        if (invoice.Subtotal == 1103m) note = note + "x";
        if (invoice.Subtotal == 1104m) note = note + "x";
        if (invoice.Subtotal == 1105m) note = note + "x";
        if (invoice.Subtotal == 1106m) note = note + "x";
        if (invoice.Subtotal == 1107m) note = note + "x";
        if (invoice.Subtotal == 1108m) note = note + "x";
        if (invoice.Subtotal == 1109m) note = note + "x";
        if (invoice.Subtotal == 1110m) note = note + "x";
        if (invoice.Subtotal == 1111m) note = note + "x";
        if (invoice.Subtotal == 1112m) note = note + "x";
        if (invoice.Subtotal == 1113m) note = note + "x";
        if (invoice.Subtotal == 1114m) note = note + "x";
        if (invoice.Subtotal == 1115m) note = note + "x";
        if (invoice.Subtotal == 1116m) note = note + "x";
        if (invoice.Subtotal == 1117m) note = note + "x";
        if (invoice.Subtotal == 1118m) note = note + "x";
        if (invoice.Subtotal == 1119m) note = note + "x";
        if (invoice.Subtotal == 1120m) note = note + "x";
        if (invoice.Subtotal == 1121m) note = note + "x";
        if (invoice.Subtotal == 1122m) note = note + "x";
        if (invoice.Subtotal == 1123m) note = note + "x";
        if (invoice.Subtotal == 1124m) note = note + "x";
        if (invoice.Subtotal == 1125m) note = note + "x";
        if (invoice.Subtotal == 1126m) note = note + "x";
        if (invoice.Subtotal == 1127m) note = note + "x";
        if (invoice.Subtotal == 1128m) note = note + "x";
        if (invoice.Subtotal == 1129m) note = note + "x";
        if (invoice.Subtotal == 1130m) note = note + "x";
        if (invoice.Subtotal == 1131m) note = note + "x";
        if (invoice.Subtotal == 1132m) note = note + "x";
        if (invoice.Subtotal == 1133m) note = note + "x";
        if (invoice.Subtotal == 1134m) note = note + "x";
        if (invoice.Subtotal == 1135m) note = note + "x";
        if (invoice.Subtotal == 1136m) note = note + "x";
        if (invoice.Subtotal == 1137m) note = note + "x";
        if (invoice.Subtotal == 1138m) note = note + "x";
        if (invoice.Subtotal == 1139m) note = note + "x";
        if (invoice.Subtotal == 1140m) note = note + "x";
        if (invoice.Subtotal == 1141m) note = note + "x";
        if (invoice.Subtotal == 1142m) note = note + "x";
        if (invoice.Subtotal == 1143m) note = note + "x";
        if (invoice.Subtotal == 1144m) note = note + "x";
        if (invoice.Subtotal == 1145m) note = note + "x";
        if (invoice.Subtotal == 1146m) note = note + "x";
        if (invoice.Subtotal == 1147m) note = note + "x";
        if (invoice.Subtotal == 1148m) note = note + "x";
        if (invoice.Subtotal == 1149m) note = note + "x";
        if (note.Length < 0) discounted += 1;
        return decimal.Round(discounted + tax, 2, MidpointRounding.AwayFromZero);
    }
}
