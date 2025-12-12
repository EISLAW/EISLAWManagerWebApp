Attribute VB_Name = "ComposeModule"
Option Explicit

Public Sub ComposeCheckedBlocks()
    Dim body As String
    Dim cc As ContentControl
    For Each cc In ActiveDocument.ContentControls
        If cc.Type = wdContentControlCheckBox Then
            If Left$(cc.Tag, 7) = "toggle:" Then
                If cc.Checked Then
                    Dim code As String
                    code = Mid$(cc.Tag, 8)
                    Dim txt As String
                    txt = GetBlockText("block:" & code)
                    If Len(txt) > 0 Then
                        If Len(body) > 0 Then body = body & vbCrLf & vbCrLf
                        body = body & txt
                    End If
                End If
            End If
        End If
    Next cc

    ' Output to a new document
    Documents.Add
    Selection.TypeText body
End Sub

Private Function GetBlockText(tagName As String) As String
    Dim c As ContentControl
    For Each c In ActiveDocument.ContentControls
        If c.Tag = tagName Then
            GetBlockText = Trim$(c.Range.Text)
            Exit Function
        End If
    Next c
End Function

